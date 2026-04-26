
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env.local' });

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log('Creating missing tables...');

  const sqls = [
    `CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      slug TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS product_variant_images (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL
    )`,
    // Ensure product_sizes is correct. If it already exists, we might need to drop and recreate if it doesn't have variant_id
    `DROP TABLE IF EXISTS product_sizes`,
    `CREATE TABLE product_sizes (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      size TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id)`,
    `CREATE INDEX IF NOT EXISTS product_variant_images_variant_id_idx ON product_variant_images(variant_id)`,
    `CREATE INDEX IF NOT EXISTS product_sizes_variant_id_idx ON product_sizes(variant_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS product_sizes_unique_idx ON product_sizes(variant_id, size)`
  ];

  for (const sql of sqls) {
    console.log(`Executing: ${sql.substring(0, 50)}...`);
    try {
      await client.execute(sql);
    } catch (e: any) {
      console.error(`- Error: ${e.message}`);
    }
  }

  console.log('Done.');
}

run().catch(console.error);
