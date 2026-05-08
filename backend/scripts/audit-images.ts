import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  const result = await client.execute('SELECT id, name, image_url FROM products');
  console.log('--- Current Products ---');
  result.rows.forEach(r => {
    console.log(`ID: ${r.id} | Name: ${r.name} | Image: ${r.image_url}`);
  });
}

check().catch(console.error);
