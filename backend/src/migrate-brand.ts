import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    await client.execute("ALTER TABLE products ADD COLUMN brand TEXT NOT NULL DEFAULT 'Velvet'");
    console.log('SUCCESS: brand column added');
  } catch (e) {
    console.error('ERROR:', e);
  }
}

migrate();
