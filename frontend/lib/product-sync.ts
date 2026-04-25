import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { db } from './db';
import { products, productImages, productSizes } from './schema';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const PRODUCTS_DIR = join(process.cwd(), 'public', 'products');
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

const BRAND_PRICES: Record<string, number> = {
  adidas: 180,
  nike: 200,
  jordan: 220,
  converse: 150,
  reebok: 160,
};

const DEFAULT_SIZES = ["39", "40", "41", "42", "43", "44"];
const DEFAULT_STOCK = 5;

/**
 * Returns a consistent price based on the brand
 */
function getDeterministicPrice(brand: string): number {
  return BRAND_PRICES[brand.toLowerCase()] || 170;
}

/**
 * Formats a slug like 'adidas-midcity-low' to 'Adidas Midcity Low'
 */
function formatName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extracts brand and model from a formatted name
 */
function parseProductInfo(name: string): { brand: string; model: string } {
  const parts = name.split(' ');
  const brand = parts[0];
  const model = parts.slice(1).join(' ');
  return { brand, model };
}

/**
 * Syncs products from the public/products folder into the database.
 * 
 * Rules:
 * 1. Each folder in public/products represents a product.
 * 2. Folder name is the product slug.
 * 3. Images inside the folder are added to product_images.
 * 4. First image is used as the main image_url.
 * 5. Prevents duplicate products by checking the unique slug.
 */
export async function syncProductsFromFolders() {
  console.log('Starting product sync from folders...');
  
  if (!existsSync(PRODUCTS_DIR)) {
    console.error(`Directory ${PRODUCTS_DIR} does not exist.`);
    return { success: false, message: 'Products directory not found' };
  }

  try {
    const entries = await readdir(PRODUCTS_DIR, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());
    
    let addedCount = 0;
    let skippedCount = 0;

    for (const folder of folders) {
      const slug = folder.name;
      const folderPath = join(PRODUCTS_DIR, slug);
      
      // CHECK if product with same slug already exists
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.slug, slug),
      });

      if (existingProduct) {
        console.log(`[SKIP] Product with slug "${slug}" already exists.`);
        skippedCount++;
        
        // Sync images and sizes for existing products if missing
        await syncProductImages(existingProduct.id, folderPath, slug);
        await syncProductSizes(existingProduct.id, slug);
        continue;
      }

      // Extract details
      const name = formatName(slug);
      const { brand, model } = parseProductInfo(name);
      
      // Scan for images
      const files = await readdir(folderPath);
      const imageFiles = files
        .filter(file => VALID_EXTENSIONS.includes(extname(file).toLowerCase()))
        .sort(); // Sort to ensure consistent main image selection

      if (imageFiles.length === 0) {
        console.warn(`[WARN] No valid images found in ${folderPath}. skipping.`);
        continue;
      }

      const mainImageUrl = `/products/${slug}/${imageFiles[0]}`;
      const productId = randomUUID();
      const price = getDeterministicPrice(brand);

      // Use a transaction for atomic product + images + sizes creation
      await db.transaction(async (tx) => {
        // INSERT product
        await tx.insert(products).values({
          id: productId,
          name,
          slug,
          price,
          description: `Experience the pinnacle of footwear engineering with the ${brand} ${model}. Part of the Velvet Syndicate curated collection, this silhouette combines timeless aesthetics with modern comfort.`,
          imageUrl: mainImageUrl,
          category: 'footwear',
          featured: false,
        });

        // INSERT all images into product_images
        for (const file of imageFiles) {
          await tx.insert(productImages).values({
            id: randomUUID(),
            productId,
            imageUrl: `/products/${slug}/${file}`,
          });
        }

        // INSERT default sizes with stock
        for (const size of DEFAULT_SIZES) {
          await tx.insert(productSizes).values({
            id: randomUUID(),
            productId,
            size,
            stock: DEFAULT_STOCK,
          });
        }
      });

      console.log(`[ADDED] ${name} (${slug})`);
      addedCount++;
    }

    console.log(`Sync complete. Added: ${addedCount}, Skipped: ${skippedCount}`);
    return { success: true, addedCount, skippedCount };
  } catch (error) {
    console.error('Error during product sync:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Helper to sync images for an existing product
 */
async function syncProductImages(productId: string, folderPath: string, slug: string) {
  try {
    const files = await readdir(folderPath);
    const imageFiles = files
      .filter(file => VALID_EXTENSIONS.includes(extname(file).toLowerCase()));

    for (const file of imageFiles) {
      const imageUrl = `/products/${slug}/${file}`;
      
      // Check if image already exists for this product
      const existingImage = await db.query.productImages.findFirst({
        where: (images, { and, eq }) => and(
          eq(images.productId, productId),
          eq(images.imageUrl, imageUrl)
        ),
      });

      if (!existingImage) {
        await db.insert(productImages).values({
          id: randomUUID(),
          productId,
          imageUrl,
        });
        console.log(`[IMAGE] Added new image ${file} to ${slug}`);
      }
    }
  } catch (error) {
    console.error(`Error syncing images for ${slug}:`, error);
  }
}

/**
 * Helper to ensure default sizes exist for a product
 */
async function syncProductSizes(productId: string, slug: string) {
  try {
    for (const size of DEFAULT_SIZES) {
      // Check if size already exists
      const existingSize = await db.query.productSizes.findFirst({
        where: and(
          eq(productSizes.productId, productId),
          eq(productSizes.size, size)
        ),
      });

      if (!existingSize) {
        await db.insert(productSizes).values({
          id: randomUUID(),
          productId,
          size,
          stock: DEFAULT_STOCK,
        });
        console.log(`[SIZE] Added missing size ${size} to ${slug}`);
      }
    }
  } catch (error) {
    console.error(`Error syncing sizes for ${slug}:`, error);
  }
}
