import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';
import fs from 'fs';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function syncDown() {
  console.log('Downloading inventory from Turso...');
  
  const products = await client.execute('SELECT * FROM products');
  const variants = await client.execute('SELECT * FROM product_variants');
  const variantImages = await client.execute('SELECT * FROM product_variant_images');
  const sizes = await client.execute('SELECT * FROM product_sizes');

  const data = {
    products: products.rows,
    variants: variants.rows,
    variantImages: variantImages.rows,
    sizes: sizes.rows,
  };

  const filePath = join(__dirname, '../inventory-backup.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`Successfully saved ${products.rows.length} products to inventory-backup.json`);
}

syncDown().catch(console.error);
