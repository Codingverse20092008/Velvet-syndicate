import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load env from root
dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function fix() {
  console.log('🔍 Checking product visibility...');
  const result = await client.execute('SELECT id, name, is_visible FROM products');
  console.log(`Found ${result.rows.length} products.`);
  
  const invisible = result.rows.filter(r => !r.is_visible);
  console.log(`${invisible.length} products are currently invisible.`);

  if (invisible.length > 0) {
    console.log('🚀 Updating all products to be visible...');
    await client.execute('UPDATE products SET is_visible = 1');
    console.log('✅ All products are now visible.');
  } else {
    console.log('✨ All products are already visible. No action needed.');
  }
}

fix().catch(console.error);
