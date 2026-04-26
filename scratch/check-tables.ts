
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env.local' });

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log('Listing tables...');
  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(res.rows.map(r => r.name));
}

run().catch(console.error);
