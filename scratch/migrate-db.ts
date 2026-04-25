import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  console.log('Dropping tables to resolve schema conflicts...');
  // Drop tables that have major changes
  await client.execute('DROP TABLE IF EXISTS orders');
  await client.execute('DROP TABLE IF EXISTS order_items');
  await client.execute('DROP TABLE IF EXISTS products');
  await client.execute('DROP TABLE IF EXISTS product_images');
  await client.execute('DROP TABLE IF EXISTS product_sizes');
  console.log('Tables dropped. Now run drizzle-kit push.');
}

migrate();
