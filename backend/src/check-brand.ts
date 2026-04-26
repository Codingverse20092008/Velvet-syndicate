import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function check() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    const res = await client.execute('SELECT brand FROM products LIMIT 1');
    console.log('SUCCESS:', res.rows);
  } catch (e) {
    console.error('ERROR:', e);
  }
}

check();
