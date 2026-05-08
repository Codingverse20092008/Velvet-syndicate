import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  const result = await client.execute('SELECT DISTINCT category FROM products');
  console.log('Categories in DB:', result.rows.map(r => r.category));
}

check().catch(console.error);
