/**
 * Create Products from Real Images
 * 
 * This script scans the 'Real Images' folder and creates products in the database
 * for each folder that doesn't already exist as a product.
 */

import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';
import { products, productSizes } from '../lib/schema';
import { eq, like } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { invalidateProductsCache } from '../lib/cache';

const REAL_IMAGES_DIR = join(process.cwd(), 'Real Images');
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jfif'];

interface ProductData {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: 'footwear' | 'accessories' | 'apparel';
  featured: boolean;
  imageUrl: string;
  sizes: { size: string; stock: number }[];
}

// Parse folder name
function parseFolderName(folderName: string): { brand: string; model: string } {
  const parts = folderName.trim().split(' ');
  const brand = parts[0];
  const model = parts.slice(1).join(' ');
  return { brand, model };
}

// Generate slug
function generateSlug(folderName: string): string {
  return folderName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Check if product exists
async function productExists(slug: string): Promise<boolean> {
  const result = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  
  return result.length > 0;
}

// Generate description
function generateDescription(brand: string, model: string): string {
  const descriptions = [
    `The ${brand} ${model} combines premium materials with timeless design.`,
    `Experience unmatched comfort with the ${brand} ${model}. Crafted for those who demand excellence.`,
    `Step into style with the ${brand} ${model}. A perfect blend of heritage and modern innovation.`,
    `The ${brand} ${model} represents the pinnacle of craftsmanship and urban sophistication.`,
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// Generate standard sneaker sizes
function generateSizes(): { size: string; stock: number }[] {
  const sizes = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'];
  return sizes.map(size => ({
    size,
    stock: Math.floor(Math.random() * 20) + 5, // Random stock 5-25
  }));
}

// Scan and create products
async function createProductsFromImages() {
  logger.info('Starting product creation from images...');
  
  if (!existsSync(REAL_IMAGES_DIR)) {
    logger.error('Real Images folder not found');
    return;
  }
  
  const folders = await readdir(REAL_IMAGES_DIR, { withFileTypes: true });
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: { folder: string; error: string }[] = [];
  
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    
    const folderPath = join(REAL_IMAGES_DIR, folder.name);
    
    // Check for images in folder
    const files = await readdir(folderPath);
    const imageFiles = files.filter(f => 
      VALID_EXTENSIONS.includes(extname(f).toLowerCase())
    );
    
    if (imageFiles.length === 0) {
      logger.warn({ folder: folder.name }, 'No images found in folder');
      continue;
    }
    
    const { brand, model } = parseFolderName(folder.name);
    const slug = generateSlug(folder.name);
    
    // Check if product already exists
    if (await productExists(slug)) {
      logger.info({ folder: folder.name }, 'Product already exists, skipping');
      skipped.push(folder.name);
      continue;
    }
    
    try {
      // Create product data
      const productData: ProductData = {
        name: folder.name,
        slug,
        description: generateDescription(brand, model),
        price: Math.floor(Math.random() * 100) + 100, // Random price $100-200
        category: 'footwear',
        featured: true, // Make all real image products featured
        imageUrl: `/real-images/${encodeURIComponent(folder.name)}/${encodeURIComponent(imageFiles[0])}`,
        sizes: generateSizes(),
      };
      
      // Insert product with generated ID
      const productId = randomUUID();
      const [newProduct] = await db
        .insert(products)
        .values({
          id: productId,
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          price: productData.price,
          category: productData.category,
          featured: productData.featured,
          imageUrl: productData.imageUrl,
        })
        .returning({ id: products.id });
      
      // Insert sizes
      for (const size of productData.sizes) {
        await db.insert(productSizes).values({
          id: randomUUID(),
          productId: productId,
          size: size.size,
          stock: size.stock,
        });
      }
      
      logger.info({ 
        product: productData.name, 
        id: newProduct.id,
        price: productData.price 
      }, 'Created product');
      
      created.push(folder.name);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error, folder: folder.name }, 'Failed to create product');
      errors.push({ folder: folder.name, error: errorMsg });
    }
  }
  
  // Invalidate cache
  if (created.length > 0) {
    await invalidateProductsCache();
  }
  
  // Summary
  logger.info({
    total: folders.filter(f => f.isDirectory()).length,
    created: created.length,
    skipped,
    errors: errors.length,
  }, 'Product creation complete');
  
  console.log('\n✅ Created products:');
  created.forEach(name => console.log(`  - ${name}`));
  
  if (skipped.length > 0) {
    console.log('\n⏭️ Skipped (already exist):');
    skipped.forEach(name => console.log(`  - ${name}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`  - ${e.folder}: ${e.error}`));
  }
  
  if (created.length === 0 && errors.length === 0) {
    console.log('\n⚠️ No new products created. All folders already have products or contain no images.');
  }
}

// Run
createProductsFromImages()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Script failed');
    process.exit(1);
  });
