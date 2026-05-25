import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';
import fs from 'fs';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function syncUp() {
  console.log('Uploading inventory to Turso from local backup...');
  
  const filePath = join(__dirname, '../inventory-backup.json');
  if (!fs.existsSync(filePath)) {
    console.log('No inventory-backup.json found. Please run sync-down.ts first.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Clear existing data to avoid conflicts
  console.log('Clearing existing inventory...');
  await client.execute('DELETE FROM product_sizes');
  await client.execute('DELETE FROM product_variant_images');
  await client.execute('DELETE FROM product_variants');
  await client.execute('DELETE FROM products');

  console.log(`Restoring ${data.products.length} products...`);
  
  // Insert products
  for (const p of data.products) {
    await client.execute({
      sql: `INSERT INTO products (
        id, name, slug, description, price, image_url, brand, category, 
        gender, product_type, featured, is_visible, is_out_of_stock, 
        is_on_sale, is_summer_sale, sale_percentage, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.id, p.name, p.slug, p.description, p.price, p.image_url, p.brand, p.category,
        p.gender, p.product_type, p.featured, p.is_visible, p.is_out_of_stock,
        p.is_on_sale, p.is_summer_sale ?? 0, p.sale_percentage, p.created_at, p.updated_at
      ]
    });
  }

  console.log(`Restoring ${data.variants.length} variants...`);
  for (const v of data.variants) {
    await client.execute({
      sql: 'INSERT INTO product_variants (id, product_id, name, color, slug, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [v.id, v.product_id, v.name, v.color, v.slug, v.created_at]
    });
  }

  console.log(`Restoring ${data.variantImages.length} variant images...`);
  for (const vi of data.variantImages) {
    await client.execute({
      sql: 'INSERT INTO product_variant_images (id, variant_id, image_url) VALUES (?, ?, ?)',
      args: [vi.id, vi.variant_id, vi.image_url]
    });
  }

  console.log(`Restoring ${data.sizes.length} sizes...`);
  for (const s of data.sizes) {
    await client.execute({
      sql: 'INSERT INTO product_sizes (id, variant_id, size, stock) VALUES (?, ?, ?, ?)',
      args: [s.id, s.variant_id, s.size, s.stock]
    });
  }

  console.log('✅ Successfully restored inventory from local backup.');
}

syncUp().catch(console.error);
