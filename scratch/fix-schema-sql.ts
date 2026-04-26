
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env.local' });

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log('Adding columns to products table...');
  try {
    await client.execute('ALTER TABLE products ADD COLUMN features TEXT');
    console.log('- Added features column');
  } catch (e) {
    console.log('- features column might already exist or error:', e.message);
  }

  try {
    await client.execute('ALTER TABLE products ADD COLUMN care_instructions TEXT');
    console.log('- Added care_instructions column');
  } catch (e) {
    console.log('- care_instructions column might already exist or error:', e.message);
  }

  console.log('Done.');
}

run().catch(console.error);
