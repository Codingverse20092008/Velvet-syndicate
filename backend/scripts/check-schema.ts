import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  console.log('--- Columns in products table ---');
  const result = await client.execute('PRAGMA table_info(products)');
  result.rows.forEach(r => console.log(`${r.name} (${r.type})`));
  
  console.log('\n--- One row sample ---');
  const sample = await client.execute('SELECT * FROM products LIMIT 1');
  console.log(JSON.stringify(sample.rows[0], null, 2));
}

check().catch(console.error);
