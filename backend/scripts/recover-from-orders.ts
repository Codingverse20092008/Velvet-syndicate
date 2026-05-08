import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function recover() {
  console.log('🔍 Searching order_items for lost products...');
  const result = await client.execute('SELECT DISTINCT product_name, product_price, image_url FROM order_items');
  console.log('Found in orders:', result.rows.length);
  result.rows.forEach(r => console.log(`- ${r.product_name} (${r.product_price}) [${r.image_url}]`));
}

recover().catch(console.error);
