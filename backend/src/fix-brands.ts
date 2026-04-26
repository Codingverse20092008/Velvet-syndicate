import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function fixBrands() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    const res = await client.execute('SELECT id, name FROM products');
    for (const row of res.rows) {
      const name = row.name as string;
      const id = row.id as string;
      const brand = name.split(' ')[0];
      await client.execute({
        sql: 'UPDATE products SET brand = ? WHERE id = ?',
        args: [brand, id]
      });
      console.log(`Updated ${name} -> ${brand}`);
    }
    console.log('SUCCESS: Brands updated');
  } catch (e) {
    console.error('ERROR:', e);
  }
}

fixBrands();
