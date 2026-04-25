/**
 * Product Image Import Script
 * 
 * This script scans the 'Real Images' folder and maps images to products
 * based on brand and model names. Images are copied to public/products
 * and product records are updated with correct image URLs.
 * 
 * Folder structure expected:
 * Real Images/
 *   Adidas MIDCITY LOW/
 *     image1.jpg
 *     image2.jpg
 *   Jordan 1 Retro/
 *     image1.jpg
 *   ...
 */

import { readdir, copyFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync } from 'fs';
import { db } from '../lib/db';
import { products } from '../lib/schema';
import { like, eq, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

const REAL_IMAGES_DIR = join(process.cwd(), 'Real Images');
const PUBLIC_PRODUCTS_DIR = join(process.cwd(), 'public', 'products');

interface ImageMapping {
  sourcePath: string;
  brand: string;
  model: string;
  targetFilename: string;
}

// Extract brand and model from folder name
// e.g., "Jordan 1 Retro" -> brand: "Jordan", model: "1 Retro"
function parseFolderName(folderName: string): { brand: string; model: string } {
  const parts = folderName.split(' ');
  // First word is typically the brand
  const brand = parts[0];
  // Rest is the model
  const model = parts.slice(1).join(' ');
  return { brand, model };
}

// Generate slug from folder name
function generateSlug(folderName: string): string {
  return folderName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Find matching product in database
async function findMatchingProduct(brand: string, model: string): Promise<typeof products.$inferSelect | null> {
  const searchPattern = `%${brand}%`;
  
  // Try to find by name containing brand
  const results = await db
    .select()
    .from(products)
    .where(like(products.name, searchPattern))
    .limit(5);
  
  // If multiple matches, try to match model too
  if (results.length > 1) {
    const modelPattern = `%${model}%`;
    const modelMatch = results.find(p => 
      p.name.toLowerCase().includes(model.toLowerCase()) ||
      p.slug.toLowerCase().includes(model.toLowerCase().replace(/\s+/g, '-'))
    );
    if (modelMatch) return modelMatch;
  }
  
  return results[0] || null;
}

// Scan Real Images folder
async function scanImageFolders(): Promise<ImageMapping[]> {
  const mappings: ImageMapping[] = [];
  
  try {
    const folders = await readdir(REAL_IMAGES_DIR, { withFileTypes: true });
    
    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      
      const folderPath = join(REAL_IMAGES_DIR, folder.name);
      const { brand, model } = parseFolderName(folder.name);
      
      try {
        const files = await readdir(folderPath, { withFileTypes: true });
        
        for (const file of files) {
          if (file.isDirectory()) continue;
          
          const ext = extname(file.name).toLowerCase();
          if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) continue;
          
          const sourcePath = join(folderPath, file.name);
          const slug = generateSlug(folder.name);
          const targetFilename = `${slug}-${mappings.filter(m => m.brand === brand).length + 1}${ext}`;
          
          mappings.push({
            sourcePath,
            brand,
            model,
            targetFilename,
          });
        }
      } catch (error) {
        logger.error({ error, folder: folder.name }, 'Error reading folder');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error scanning Real Images folder');
  }
  
  return mappings;
}

// Import images and update products
async function importImages() {
  logger.info('Starting product image import...');
  
  // Ensure public/products directory exists
  if (!existsSync(PUBLIC_PRODUCTS_DIR)) {
    await mkdir(PUBLIC_PRODUCTS_DIR, { recursive: true });
  }
  
  const mappings = await scanImageFolders();
  logger.info({ count: mappings.length }, 'Found images');
  
  if (mappings.length === 0) {
    logger.warn('No images found in Real Images folder. Add images to folders first.');
    return;
  }
  
  const updatedProducts: string[] = [];
  const errors: { source: string; error: string }[] = [];
  
  for (const mapping of mappings) {
    try {
      // Copy image to public/products
      const targetPath = join(PUBLIC_PRODUCTS_DIR, mapping.targetFilename);
      await copyFile(mapping.sourcePath, targetPath);
      
      // Find matching product
      const product = await findMatchingProduct(mapping.brand, mapping.model);
      
      if (product) {
        // Update product with new image URL
        const imageUrl = `/products/${mapping.targetFilename}`;
        
        await db
          .update(products)
          .set({
            imageUrl,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(products.id, product.id));
        
        updatedProducts.push(`${product.name} -> ${mapping.targetFilename}`);
        logger.info({ product: product.name, image: mapping.targetFilename }, 'Updated product image');
      } else {
        logger.warn({ brand: mapping.brand, model: mapping.model }, 'No matching product found');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ source: mapping.sourcePath, error: errorMsg });
      logger.error({ error, source: mapping.sourcePath }, 'Failed to import image');
    }
  }
  
  // Summary
  logger.info({
    totalImages: mappings.length,
    updatedProducts: updatedProducts.length,
    errors: errors.length,
  }, 'Import complete');
  
  if (updatedProducts.length > 0) {
    console.log('\n✅ Updated products:');
    updatedProducts.forEach(p => console.log(`  - ${p}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`  - ${e.source}: ${e.error}`));
  }
  
  if (updatedProducts.length === 0 && errors.length === 0) {
    console.log('\n⚠️ No products were updated. Make sure products exist in database matching Real Images folder names.');
  }
}

// Run import
importImages()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Import failed');
    process.exit(1);
  });
