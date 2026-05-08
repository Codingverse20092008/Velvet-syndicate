import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function clear() {
  console.log('🗑️ Clearing all product data...');
  await client.execute('DELETE FROM product_sizes');
  await client.execute('DELETE FROM product_variant_images');
  await client.execute('DELETE FROM product_variants');
  await client.execute('DELETE FROM products');
  console.log('✅ Database cleared.');
}

clear().catch(console.error);
