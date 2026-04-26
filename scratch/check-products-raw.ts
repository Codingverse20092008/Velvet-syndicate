
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkProducts() {
  const result = await client.execute('SELECT * FROM products');
  console.log('Products count:', result.rows.length);
  console.log('Sample product:', result.rows[0]);
}

checkProducts().catch(console.error);
