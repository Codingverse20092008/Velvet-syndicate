import * as dotenv from 'dotenv'
import { join } from 'path'
dotenv.config({ path: join(__dirname, '../../.env.local') })
import { createClient } from '@libsql/client'

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function main() {
  console.log('=== Import Verification ===\n')

  // Quiz packs
  const p = await c.execute('SELECT COUNT(*) as cnt FROM quiz_packs')
  console.log(`Quiz packs: ${(p.rows[0] as any).cnt}`)

  // Quiz questions
  const q = await c.execute('SELECT COUNT(*) as cnt FROM quiz_questions')
  console.log(`Quiz questions: ${(q.rows[0] as any).cnt}`)

  // Questions by type
  const qt = await c.execute('SELECT type, COUNT(*) as cnt FROM quiz_questions GROUP BY type')
  console.log('\nBy type:', (qt.rows as any[]).map(r => `${r.type}=${r.cnt}`).join(', '))

  // Questions by difficulty
  const qd = await c.execute('SELECT difficulty, COUNT(*) as cnt FROM quiz_questions GROUP BY difficulty')
  console.log('By difficulty:', (qd.rows as any[]).map(r => `${r.difficulty}=${r.cnt}`).join(', '))

  // Questions by category
  const qc = await c.execute('SELECT category, COUNT(*) as cnt FROM quiz_questions GROUP BY category')
  console.log('By category:', (qc.rows as any[]).map(r => `${r.category}=${r.cnt}`).join(', '))

  // Daily pool
  const d = await c.execute("SELECT COUNT(*) as cnt FROM quiz_pool_history WHERE pool_type = 'daily' AND date = date('now')")
  console.log(`\nDaily pool: ${(d.rows[0] as any).cnt}`)

  // Weekly pool
  const w = await c.execute("SELECT COUNT(*) as cnt FROM quiz_pool_history WHERE pool_type = 'weekly' AND strftime('%Y-%W', date) = strftime('%Y-%W', 'now')")
  console.log(`Weekly pool: ${(w.rows[0] as any).cnt}`)

  // Pack detail
  const pd = await c.execute('SELECT id, pack_name, version, question_count, total_xp, total_coins, status FROM quiz_packs ORDER BY imported_at DESC LIMIT 1')
  if (pd.rows.length > 0) {
    const pack = pd.rows[0] as any
    console.log(`\nLatest pack: "${pack.pack_name}" v${pack.version}`)
    console.log(`Questions: ${pack.question_count}, XP: ${pack.total_xp}, Coins: ${pack.total_coins}, Status: ${pack.status}`)
  }

  // Sample questions
  const sq = await c.execute('SELECT id, pack_id, type, question, difficulty, category, xp, coins FROM quiz_questions LIMIT 3')
  console.log('\nSample questions:')
  ;(sq.rows as any[]).forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.type}|${r.difficulty}|${r.category}] ${r.question.substring(0, 60)}... XP=${r.xp} Coins=${r.coins}`)
  })

  console.log('\n✅ Verification complete')
}

main().catch(console.error)
