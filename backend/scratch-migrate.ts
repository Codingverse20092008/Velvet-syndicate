import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  console.log('Running manual migrations...');
  try {
    await client.execute('ALTER TABLE cart ADD COLUMN version INTEGER NOT NULL DEFAULT 0');
    console.log('✅ Added version to cart');
  } catch (e: any) {
    console.log('⚠️ version column might already exist:', e.message);
  }
  
  try {
    await client.execute('ALTER TABLE orders ADD COLUMN idempotency_key TEXT');
    console.log('✅ Added idempotency_key to orders');
  } catch (e: any) {
    console.log('⚠️ idempotency_key column might already exist:', e.message);
  }

  try {
    await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_idx ON orders (idempotency_key)');
    console.log('✅ Created unique index on idempotency_key');
  } catch (e: any) {
    console.log('⚠️ index creation failed:', e.message);
  }
}

migrate().then(() => process.exit(0));
