
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkImages() {
  const result = await client.execute('SELECT name, image_url FROM products');
  console.log('Product Images:');
  result.rows.forEach(row => {
    console.log(`- ${row.name}: ${row.image_url}`);
  });
}

checkImages().catch(console.error);
