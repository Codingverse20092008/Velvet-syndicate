/**
 * Update Existing Products with Real Images
 * 
 * This script updates existing products in the database with images
 * from the Real Images folder based on matching slugs.
 */

import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { db } from '../lib/db';
import { products } from '../lib/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { invalidateProductsCache } from '../lib/cache';

const REAL_IMAGES_DIR = join(process.cwd(), 'Real Images');
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jfif'];

// Generate slug from folder name
function generateSlug(folderName: string): string {
  return folderName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Get first image from folder
async function getFirstImage(folderPath: string): Promise<string | null> {
  try {
    const files = await readdir(folderPath);
    for (const file of files) {
      if (VALID_EXTENSIONS.includes(extname(file).toLowerCase())) {
        return file;
      }
    }
  } catch {
    return null;
  }
  return null;
}

// Update products with real images
async function updateProductsWithImages() {
  logger.info('Starting product update with real images...');
  
  if (!existsSync(REAL_IMAGES_DIR)) {
    logger.error('Real Images folder not found');
    return;
  }
  
  const folders = await readdir(REAL_IMAGES_DIR, { withFileTypes: true });
  const updated: string[] = [];
  const notFound: string[] = [];
  const errors: { folder: string; error: string }[] = [];
  
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    
    const slug = generateSlug(folder.name);
    const folderPath = join(REAL_IMAGES_DIR, folder.name);
    
    // Get first image
    const firstImage = await getFirstImage(folderPath);
    if (!firstImage) {
      logger.warn({ folder: folder.name }, 'No images found in folder');
      continue;
    }
    
    const imageUrl = `/real-images/${encodeURIComponent(folder.name)}/${encodeURIComponent(firstImage)}`;
    
    try {
      // Check if product exists
      const existing = await db
        .select({ id: products.id, name: products.name, imageUrl: products.imageUrl })
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);
      
      if (existing.length === 0) {
        logger.warn({ slug, folder: folder.name }, 'Product not found in database');
        notFound.push(folder.name);
        continue;
      }
      
      // Update product with real image
      await db
        .update(products)
        .set({ imageUrl })
        .where(eq(products.id, existing[0].id));
      
      logger.info({ 
        product: existing[0].name, 
        oldImage: existing[0].imageUrl,
        newImage: imageUrl 
      }, 'Updated product image');
      
      updated.push(folder.name);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error, folder: folder.name }, 'Failed to update product');
      errors.push({ folder: folder.name, error: errorMsg });
    }
  }
  
  // Invalidate cache if any updates
  if (updated.length > 0) {
    await invalidateProductsCache();
    logger.info('Cache invalidated');
  }
  
  // Summary
  logger.info({
    total: folders.filter(f => f.isDirectory()).length,
    updated: updated.length,
    notFound,
    errors: errors.length,
  }, 'Update complete');
  
  console.log('\n✅ Updated products with real images:');
  updated.forEach(name => console.log(`  - ${name}`));
  
  if (notFound.length > 0) {
    console.log('\n⚠️ Products not found in database:');
    notFound.forEach(name => console.log(`  - ${name}`));
    console.log('\nThese folders exist but no matching products in DB.');
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`  - ${e.folder}: ${e.error}`));
  }
}

// Run
updateProductsWithImages()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Script failed');
    process.exit(1);
  });
