/**
 * Real Product Images Loader
 * 
 * Scans the Real Images folder and maps images to products for display
 * on the landing page. Falls back to database images if no real images found.
 */

import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

const REAL_IMAGES_DIR = join(process.cwd(), 'Real Images');
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jfif'];

interface RealImageProduct {
  id: string;
  name: string;
  brand: string;
  model: string;
  slug: string;
  imagePath: string;
  folderName: string;
}

// Parse folder name into brand and model
function parseFolderName(folderName: string): { brand: string; model: string } {
  const parts = folderName.trim().split(' ');
  const brand = parts[0];
  const model = parts.slice(1).join(' ');
  return { brand, model };
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Get the first valid image from a folder
async function getFirstImage(folderPath: string): Promise<string | null> {
  try {
    const files = await readdir(folderPath);
    
    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (VALID_EXTENSIONS.includes(ext)) {
        return file;
      }
    }
  } catch {
    return null;
  }
  return null;
}

// Scan Real Images folder and return products
export async function getRealImageProducts(): Promise<RealImageProduct[]> {
  const products: RealImageProduct[] = [];
  
  if (!existsSync(REAL_IMAGES_DIR)) {
    return [];
  }
  
  try {
    const folders = await readdir(REAL_IMAGES_DIR, { withFileTypes: true });
    
    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      
      const folderPath = join(REAL_IMAGES_DIR, folder.name);
      const firstImage = await getFirstImage(folderPath);
      
      if (firstImage) {
        const { brand, model } = parseFolderName(folder.name);
        const slug = generateSlug(folder.name);
        
        products.push({
          id: slug,
          name: folder.name,
          brand,
          model,
          slug,
          imagePath: `/real-images/${encodeURIComponent(folder.name)}/${encodeURIComponent(firstImage)}`,
          folderName: folder.name,
        });
      }
    }
  } catch (error) {
    console.error('Error scanning Real Images:', error);
  }
  
  return products.sort((a, b) => a.name.localeCompare(b.name));
}

// Check if Real Images folder has any images
export async function hasRealImages(): Promise<boolean> {
  const products = await getRealImageProducts();
  return products.length > 0;
}

// Get all images from a specific folder
export async function getFolderImages(folderName: string): Promise<string[]> {
  const folderPath = join(REAL_IMAGES_DIR, folderName);
  
  if (!existsSync(folderPath)) {
    return [];
  }
  
  try {
    const files = await readdir(folderPath);
    return files
      .filter(file => VALID_EXTENSIONS.includes(extname(file).toLowerCase()))
      .map(file => `/real-images/${encodeURIComponent(folderName)}/${encodeURIComponent(file)}`);
  } catch {
    return [];
  }
}
