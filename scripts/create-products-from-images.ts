/**
 * Create Products from Real Images with Variant Support
 */

import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { db } from '../backend/src/lib/db';
import { products, productVariants, productVariantImages, productSizes } from '../backend/src/lib/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../backend/src/lib/logger';
import { invalidateProductsCache } from '../backend/src/lib/cache';

const REAL_IMAGES_DIR = join(process.cwd(), 'Real Images');
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jfif'];

interface VariantData {
  name: string;
  color: string;
  images: string[];
  sizes: { size: string; stock: number }[];
}

interface ProductData {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: 'footwear' | 'accessories' | 'apparel';
  featured: boolean;
  variants: VariantData[];
}

function generateSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateSizes(): { size: string; stock: number }[] {
  const sizes = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'];
  return sizes.map(size => ({
    size,
    stock: Math.floor(Math.random() * 20) + 5,
  }));
}

async function createProductsFromImages() {
  logger.info('Starting product creation from images with variants...');
  
  if (!existsSync(REAL_IMAGES_DIR)) {
    logger.error('Real Images folder not found');
    return;
  }
  
  const folders = await readdir(REAL_IMAGES_DIR, { withFileTypes: true });
  
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const folderPath = join(REAL_IMAGES_DIR, folder.name);
    const slug = generateSlug(folder.name);
    
    // Skip if already exists
    const existing = await db.select().from(products).where(eq(products.slug as any, slug as any) as any).limit(1);
    if (existing.length > 0) {
      logger.info({ folder: folder.name }, 'Product exists, skipping');
      continue;
    }

    try {
      const subItems = await readdir(folderPath, { withFileTypes: true });
      const variantFolders = subItems.filter(item => item.isDirectory());
      const directImages = subItems.filter(item => !item.isDirectory() && VALID_EXTENSIONS.includes(extname(item.name).toLowerCase()));

      const variants: VariantData[] = [];

      if (variantFolders.length > 0) {
        // Handle nested variants
        for (const vFolder of variantFolders) {
          const vPath = join(folderPath, vFolder.name);
          const vImages = (await readdir(vPath)).filter(f => VALID_EXTENSIONS.includes(extname(f).toLowerCase()));
          
          if (vImages.length > 0) {
            variants.push({
              name: vFolder.name,
              color: vFolder.name.toLowerCase().split(' ')[0] || 'multicolor',
              images: vImages.map(img => `/real-images/${folder.name}/${vFolder.name}/${img}`),
              sizes: generateSizes()
            });
          }
        }
      } else if (directImages.length > 0) {
        // Handle single variant product
        variants.push({
          name: 'Standard',
          color: 'original',
          images: directImages.map(img => `/real-images/${folder.name}/${img.name}`),
          sizes: generateSizes()
        });
      }

      if (variants.length === 0) continue;

      const productId = randomUUID();
      await db.transaction(async (tx: any) => {
        // Insert product
        await tx.insert(products).values({
          id: productId,
          name: folder.name,
          slug,
          description: `Premium ${folder.name} featuring state-of-the-art design and comfort.`,
          price: 150 + Math.floor(Math.random() * 100),
          imageUrl: variants[0].images[0], // Main image is first image of first variant
          category: 'footwear',
          featured: true,
        });

        // Insert variants
        for (const v of variants) {
          const variantId = randomUUID();
          await tx.insert(productVariants).values({
            id: variantId,
            productId,
            name: v.name,
            color: v.color,
            slug: generateSlug(`${folder.name}-${v.name}`),
          });

          // Insert variant images
          for (const img of v.images) {
            await tx.insert(productVariantImages).values({
              id: randomUUID(),
              variantId,
              imageUrl: img,
            });
          }

          // Insert sizes
          for (const s of v.sizes) {
            await tx.insert(productSizes).values({
              id: randomUUID(),
              variantId,
              size: s.size,
              stock: s.stock,
            });
          }
        }
      });

      logger.info({ product: folder.name, variants: variants.length }, 'Created product with variants');
    } catch (error) {
      logger.error({ error, folder: folder.name }, 'Failed to process folder');
    }
  }
  
  await invalidateProductsCache();
  logger.info('Sync complete');
}

createProductsFromImages().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
