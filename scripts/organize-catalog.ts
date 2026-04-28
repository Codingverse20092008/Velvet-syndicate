import { readdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync, writeFileSync, statSync } from 'fs';
import { db } from '../backend/src/lib/db';
import { products } from '../backend/src/lib/schema';
import { eq } from 'drizzle-orm';

const MEN_DIR = join(process.cwd(), 'Men shoes');
const WOMEN_DIR = join(process.cwd(), 'Women Shoes');

const BRANDS = ['Nike', 'Adidas', 'Puma', 'Asian', 'Boldfit', 'Campus', 'Reebok', 'New Balance', 'Asics', 'Vans', 'Converse', 'Jordan'];

// Interface is defined below

function cleanTitle(filename: string, brand: string): { title: string; color?: string; slug: string } {
  let name = basename(filename, extname(filename));
  let color: string | undefined;

  // Extract color from parentheses
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch) {
    color = parenMatch[1].trim();
    name = name.replace(/\([^)]+\)/, '').trim();
  }

  // Remove generic words but keep brand if it's at the start and part of the model name
  const genericWords = [
    /Men's/i, /Women's/i, /Men/i, /Women/i, /Shoes/i, /Casual/i, /Sneaker/i, /Sneakers/i, /for/i,
    /\bWo\b/i, // Remove "Wo" abbreviation
  ];
  genericWords.forEach(word => {
    name = name.replace(word, '').trim();
  });

  // Ensure brand is at the start if not already
  if (!name.toLowerCase().startsWith(brand.toLowerCase())) {
    name = `${brand} ${name}`;
  }

  // If no color yet, check if the last word(s) look like a color
  if (!color) {
    const commonColors = ['Off NOIR', 'Bred', 'Shadow', 'Volt', 'Noir', 'Triple Black', 'Triple White', 'Panda', 'Chicago'];
    for (const c of commonColors) {
      if (name.toLowerCase().endsWith(c.toLowerCase())) {
        color = c;
        name = name.slice(0, -c.length).trim();
        break;
      }
    }
  }

  // Clean up multiple spaces
  name = name.replace(/\s+/g, ' ').trim();
  
  // If we have a color, append it to the title to make it unique if there are multiple variants
  // The user said "Keep titles premium and clean", so maybe "Nike Air Force 1 - Off Noir"
  let displayTitle = name;
  if (color) {
    displayTitle = `${name} - ${color.replace(/-/g, ' ')}`;
  }

  const slug = displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return { title: displayTitle, color, slug };
}

function extractBrand(folderName: string, filename: string): string {
  // First check folder name
  for (const brand of BRANDS) {
    if (folderName.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  // Then check filename
  for (const brand of BRANDS) {
    if (filename.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return folderName.split(' ')[0]; // Fallback to first word of folder
}

interface ProductData {
  title: string;
  brand: string;
  category: 'Men' | 'Women';
  subcategory: string;
  image: string;
  color?: string;
  slug: string;
}

async function processFolder(dir: string, category: 'Men' | 'Women'): Promise<ProductData[]> {
  const results: ProductData[] = [];
  if (!existsSync(dir)) return results;

  const brandFolders = await readdir(dir, { withFileTypes: true });
  for (const brandFolder of brandFolders) {
    if (!brandFolder.isDirectory()) continue;

    const brandPath = join(dir, brandFolder.name);
    const files = await readdir(brandPath);

    for (const file of files) {
      if (statSync(join(brandPath, file)).isDirectory()) continue;
      
      const brand = extractBrand(brandFolder.name, file);
      const { title, color, slug } = cleanTitle(file, brand);
      
      results.push({
        title,
        brand,
        category,
        subcategory: brand,
        image: `/${category === 'Men' ? 'Men shoes' : 'Women Shoes'}/${brandFolder.name}/${file}`,
        color,
        slug
      });
    }
  }
  return results;
}

async function run() {
  console.log('Processing catalog...');
  
  const menProducts = await processFolder(MEN_DIR, 'Men');
  const womenProducts = await processFolder(WOMEN_DIR, 'Women');
  
  const allProducts = [...menProducts, ...womenProducts];

  // Update database
  console.log(`Found ${allProducts.length} products. Updating database...`);
  
  for (const p of allProducts) {
    // Check if product exists (by slug or name)
    const existing = await db.select().from(products)
      .where(eq(products.slug as any, p.slug as any) as any)
      .limit(1);
    
    if (existing.length > 0) {
      console.log(`Updating existing product: ${p.title} (${p.slug})`);
      await db.update(products)
        .set({
          name: p.title,
          brand: p.brand,
          category: p.category.toLowerCase(), // Store as 'men' or 'women'
        })
        .where(eq(products.id as any, existing[0].id as any) as any);
    }
  }

  // Final Output
  const output = JSON.stringify(allProducts, null, 2);
  console.log(output);
  writeFileSync('shoe_catalog.json', output);
  console.log('Catalog generated in shoe_catalog.json');
}

run().catch(console.error);
