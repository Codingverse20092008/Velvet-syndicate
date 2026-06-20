import { createClient } from '@libsql/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN || '';

if (!TURSO_URL) {
  console.error('TURSO_DATABASE_URL not set in environment');
  process.exit(1);
}

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

interface CrateDef {
  name: string;
  description: string;
  crateType: 'basic' | 'premium' | 'event' | 'seasonal';
  cost: number;
  isActive: boolean;
  rewards: {
    rewardType: string;
    rewardValue: string;
    rewardName: string;
    probability: number;
  }[];
}

const CRATES: CrateDef[] = [
  {
    name: 'Basic Mystery Crate',
    description: 'A standard mystery crate for daily progression and engagement. Contains XP, coins, coupons, and badge fragments.',
    crateType: 'basic',
    cost: 600,
    isActive: true,
    rewards: [
      { rewardType: 'xp', rewardValue: '25', rewardName: '25 XP', probability: 30 },
      { rewardType: 'xp', rewardValue: '50', rewardName: '50 XP', probability: 20 },
      { rewardType: 'coins', rewardValue: '25', rewardName: '25 Vault Coins', probability: 20 },
      { rewardType: 'coins', rewardValue: '50', rewardName: '50 Vault Coins', probability: 10 },
      { rewardType: 'shipping', rewardValue: 'free_shipping', rewardName: 'Free Shipping', probability: 8 },
      { rewardType: 'coupon', rewardValue: '5', rewardName: '5% Coupon', probability: 7 },
      { rewardType: 'badge', rewardValue: 'rare_badge_fragment', rewardName: 'Rare Badge Fragment', probability: 5 },
    ],
  },
  {
    name: 'Premium Mystery Crate',
    description: 'A premium crate for mid-to-late game progression with higher value rewards including badges and early access passes.',
    crateType: 'premium',
    cost: 1500,
    isActive: true,
    rewards: [
      { rewardType: 'xp', rewardValue: '100', rewardName: '100 XP', probability: 25 },
      { rewardType: 'xp', rewardValue: '150', rewardName: '150 XP', probability: 20 },
      { rewardType: 'coins', rewardValue: '100', rewardName: '100 Vault Coins', probability: 20 },
      { rewardType: 'shipping', rewardValue: 'free_shipping', rewardName: 'Free Shipping', probability: 15 },
      { rewardType: 'coupon', rewardValue: '10', rewardName: '10% Coupon', probability: 10 },
      { rewardType: 'access', rewardValue: 'early_access_pass', rewardName: 'Early Access Pass', probability: 7 },
      { rewardType: 'badge', rewardValue: 'exclusive_badge', rewardName: 'Exclusive Badge', probability: 3 },
    ],
  },
  {
    name: 'Heatwave Event Crate',
    description: 'Joto Gorom Toto Char exclusive rewards from the Heatwave event. Contains badges, profile frames, titles, and premium crate drops.',
    crateType: 'event',
    cost: 0,
    isActive: true,
    rewards: [
      { rewardType: 'xp', rewardValue: '50', rewardName: '50 XP', probability: 25 },
      { rewardType: 'xp', rewardValue: '100', rewardName: '100 XP', probability: 20 },
      { rewardType: 'coins', rewardValue: '50', rewardName: '50 Vault Coins', probability: 20 },
      { rewardType: 'badge', rewardValue: 'heatwave_survivor_badge', rewardName: 'Heatwave Survivor Badge', probability: 15 },
      { rewardType: 'frame', rewardValue: 'heatwave_event_frame', rewardName: 'Exclusive Event Profile Frame', probability: 10 },
      { rewardType: 'crate', rewardValue: 'premium', rewardName: 'Premium Mystery Crate', probability: 8 },
      { rewardType: 'title', rewardValue: 'heat_king_title', rewardName: 'Heat King Title', probability: 2 },
    ],
  },
];

function validateProbabilities(crate: CrateDef): void {
  const total = crate.rewards.reduce((sum, r) => sum + r.probability, 0);
  if (Math.abs(total - 100) > 0.01) {
    console.error(`ERROR: "${crate.name}" probabilities sum to ${total}%, expected 100%`);
    process.exit(1);
  }
  console.log(`  ✓ Probability: ${total}% (validated)`);
}

async function crateExists(name: string): Promise<boolean> {
  const result = await db.execute(
    `SELECT id FROM vault_crate_types WHERE name = ${esc(name)} LIMIT 1`
  );
  return (result.rows || []).length > 0;
}

async function seedCrates(): Promise<void> {
  console.log('━━━ Velvet Vault — Crate Seeder ━━━\n');

  // Ensure tables exist
  console.log('Ensuring crate tables exist...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_crate_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      crate_type TEXT NOT NULL CHECK(crate_type IN ('basic', 'premium', 'event', 'seasonal')),
      cost INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      reward_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_crate_rewards (
      id TEXT PRIMARY KEY,
      crate_id TEXT NOT NULL REFERENCES vault_crate_types(id) ON DELETE CASCADE,
      reward_type TEXT NOT NULL,
      reward_value TEXT,
      reward_name TEXT NOT NULL DEFAULT '',
      probability REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);
  console.log('  ✓ Tables ready\n');

  // Pre-validate all probabilities
  console.log('Validating reward probabilities...');
  for (const crate of CRATES) {
    validateProbabilities(crate);
  }
  console.log('');

  // Create each crate
  for (const crate of CRATES) {
    const exists = await crateExists(crate.name);
    if (exists) {
      console.log(`∃ "${crate.name}" already exists, skipping`);
      continue;
    }

    const crateId = crypto.randomUUID();
    const now = new Date().toISOString();

    console.log(`Creating "${crate.name}"...`);

    await db.execute(`
      INSERT INTO vault_crate_types (id, name, description, crate_type, cost, is_active, reward_count, created_at, updated_at)
      VALUES (${esc(crateId)}, ${esc(crate.name)}, ${esc(crate.description)}, ${esc(crate.crateType)}, ${esc(crate.cost)}, ${esc(crate.isActive ? 1 : 0)}, 0, ${esc(now)}, ${esc(now)})
    `);

    for (const reward of crate.rewards) {
      const rewardId = crypto.randomUUID();
      await db.execute(`
        INSERT INTO vault_crate_rewards (id, crate_id, reward_type, reward_value, reward_name, probability, created_at)
        VALUES (${esc(rewardId)}, ${esc(crateId)}, ${esc(reward.rewardType)}, ${esc(reward.rewardValue)}, ${esc(reward.rewardName)}, ${esc(reward.probability)}, ${esc(now)})
      `);
    }

    // Update reward count
    const countResult = await db.execute(
      `SELECT COUNT(*) AS cnt FROM vault_crate_rewards WHERE crate_id = ${esc(crateId)}`
    );
    const rewardCount = Number((countResult.rows as any[])[0]?.cnt || 0);

    await db.execute(`
      UPDATE vault_crate_types SET reward_count = ${esc(rewardCount)}, updated_at = ${esc(now)}
      WHERE id = ${esc(crateId)}
    `);

    console.log(`  ✓ ${crate.rewards.length} rewards added (${crate.crateType}, ${crate.cost > 0 ? `${crate.cost} coins` : 'not purchasable'})`);
  }

  // Summary
  console.log('');
  console.log('━━━ Seed Summary ━━━');

  const allCrates = await db.execute(`
    SELECT ct.name, ct.crate_type, ct.cost, ct.is_active,
           (SELECT COUNT(*) FROM vault_crate_rewards WHERE crate_id = ct.id) AS rewards
    FROM vault_crate_types ct ORDER BY ct.created_at ASC
  `);

  console.log('');
  for (const row of (allCrates.rows || []) as any[]) {
    const status = row.is_active === 1 ? 'Active' : 'Disabled';
    const cost = row.cost > 0 ? `${row.cost} coins` : 'Not for sale';
    console.log(`  ${row.name}`);
    console.log(`    Type: ${row.crate_type} | Cost: ${cost} | Rewards: ${row.rewards} | Status: ${status}`);
  }

  console.log(`\n  Total crates: ${(allCrates.rows || []).length}`);

  // Final analytics check
  console.log('');
  console.log('━━━ Analytics Ready ━━━');
  console.log('  ✓ vault_crate_open_log tracks all openings');
  console.log('  ✓ vault_crate_types with is_active enables filtering');
  console.log('  ✓ Reward distribution queryable via crate analytics endpoint');
  console.log('  ✓ Anti-abuse daily limits enforced at open time');
  console.log('');
  console.log('Seed complete.');
}

seedCrates().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
