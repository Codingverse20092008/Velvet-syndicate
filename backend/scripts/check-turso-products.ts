import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  const countResult = await client.execute('SELECT COUNT(*) as count FROM products');
  console.log('Total products in Turso:', countResult.rows[0].count);

  const visResult = await client.execute('SELECT is_visible, COUNT(*) as count FROM products GROUP BY is_visible');
  console.log('Products by visibility:');
  for (const row of visResult.rows) {
    console.log(`  is_visible=${row.is_visible}: ${row.count}`);
  }

  const allResult = await client.execute('SELECT id, name, slug, is_visible, featured FROM products ORDER BY created_at');
  console.log('\nAll products in Turso:');
  for (const row of allResult.rows) {
    console.log(`  ${row.name} (visible=${row.is_visible}, featured=${row.featured})`);
  }

  client.close();
}

main().catch(console.error);
