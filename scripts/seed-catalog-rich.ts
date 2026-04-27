
import { db } from '../backend/src/lib/db';
import { products, productVariants, productVariantImages, productSizes, cartItems, orderItems } from '../backend/src/lib/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

const catalog = [
  {
    "name": "Nike Dunk Low Premium 'City Pack'",
    "brand": "Nike",
    "model": "Dunk Low",
    "slug": "nike-dunk-low-city-pack",
    "category": "sneakers",
    "type": "Streetwear",
    "price": 3490,
    "description": "A vibrant series celebrating urban energy through bold color blocking and industrial-inspired textures. Designed for those who treat the city as their canvas.",
    "features": ["Vibrant neon accents", "Low-profile silhouette", "Reinforced stitching"],
    "variants": [
      { 
        "variant_name": "Neon Strike / Turbo Yellow", 
        "color": "#FFEB3B", 
        "images": [
          "/real-images/WhatsApp Image 2026-04-26 at 10.55.27 AM.jpeg",
          "/real-images/WhatsApp Image 2026-04-26 at 10.55.24 AM (1).jpeg",
          "/real-images/WhatsApp Image 2026-04-26 at 10.55.24 AM (2).jpeg",
          "/real-images/WhatsApp Image 2026-04-26 at 10.55.25 AM (1).jpeg",
          "/real-images/WhatsApp Image 2026-04-26 at 10.55.25 AM (2).jpeg",
          "/real-images/WhatsApp Image 2026-04-26 at 10.55.25 AM.jpeg",
          "/real-images/WhatsApp Image 2026-04-26 at 10.55.36 AM.jpeg"
        ] 
      }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  },
  {
    "name": "Jordan Retro High Top",
    "brand": "Jordan",
    "model": "Retro High",
    "slug": "jordan-retro-high-top",
    "category": "sneakers",
    "type": "Streetwear",
    "price": 4990,
    "description": "A technical high-top silhouette that merges athletic performance with high-street aesthetics. Offers exceptional support and a layered, multi-dimensional design.",
    "features": ["High-top ankle support", "Visible air cushioning", "Layered synthetic upper"],
    "variants": [
      { "variant_name": "Olive Camo", "color": "#556B2F", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.27 AM (2).jpeg"] },
      { "variant_name": "Grey Heritage", "color": "#9E9E9E", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.28 AM (1).jpeg"] },
      { "variant_name": "Crimson Fade", "color": "#B71C1C", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.28 AM.jpeg"] },
      { "variant_name": "Midnight Shadow", "color": "#000000", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.29 AM (1).jpeg"] },
      { "variant_name": "Pure Arctic", "color": "#FFFFFF", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.29 AM.jpeg"] },
      { "variant_name": "Dior Grey", "color": "#E0E0E0", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.32 AM (2).jpeg"] }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  },
  {
    "name": "Brooks DNA Runner",
    "brand": "Brooks",
    "model": "DNA Tuned",
    "slug": "brooks-dna-runner",
    "category": "sneakers",
    "type": "Performance Running",
    "price": 2890,
    "description": "Engineered for maximum energy return and adaptive support. Featuring a DNA Tuned midsole that adjusts to your stride.",
    "features": ["DNA Tuned cushioning", "Reinforced heel counter"],
    "variants": [
      { "variant_name": "Triple White", "color": "#FFFFFF", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.29 AM (2).jpeg"] },
      { "variant_name": "Onyx Silver", "color": "#757575", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.30 AM.jpeg", "/real-images/WhatsApp Image 2026-04-26 at 10.55.31 AM (1).jpeg"] },
      { "variant_name": "Core Black", "color": "#212121", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.31 AM.jpeg"] }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  },
  {
    "name": "Adidas Lightstrike Pro",
    "brand": "Adidas",
    "model": "Adizero Pro",
    "slug": "adidas-lightstrike-pro",
    "category": "sneakers",
    "type": "Performance Running",
    "price": 3990,
    "description": "Built for speed and record-breaking performance. Featuring high-rebound Lightstrike Pro cushioning.",
    "features": ["Lightstrike Pro cushioning", "Carbon-infused energy return"],
    "variants": [
      { "variant_name": "Solar Red", "color": "#D32F2F", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.24 AM.jpeg", "/real-images/WhatsApp Image 2026-04-26 at 10.55.32 AM.jpeg"] },
      { "variant_name": "Night Shade", "color": "#303F9F", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.35 AM.jpeg"] }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  },
  {
    "name": "Puma Suede XL",
    "brand": "Puma",
    "model": "Suede XL",
    "slug": "puma-suede-xl",
    "category": "sneakers",
    "type": "Streetwear",
    "price": 1890,
    "description": "An exaggerated take on the iconic court sneaker. The Suede XL brings a bold, chunky aesthetic.",
    "features": ["Chunky XL silhouette", "Premium soft suede"],
    "variants": [
      { "variant_name": "Black White Classic", "color": "#000000", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.33 AM (1).jpeg"] },
      { "variant_name": "Olive Suede", "color": "#6B8E23", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.35 AM (1).jpeg"] }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  },
  {
    "name": "Court Low 'Navy Cream'",
    "brand": "Streetwear",
    "model": "Court Casual",
    "slug": "court-low-navy-cream",
    "category": "sneakers",
    "type": "Streetwear",
    "price": 1490,
    "description": "A versatile and lightweight casual sneaker with a premium mesh upper and clean white midsole.",
    "features": ["Breathable mesh", "Lightweight sole"],
    "variants": [
      { "variant_name": "Navy Cream", "color": "#1A237E", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.23 AM.jpeg"] }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  },
  {
    "name": "Nike Air Force 1 Low",
    "brand": "Nike",
    "model": "Air Force 1",
    "slug": "nike-air-force-1-low",
    "category": "sneakers",
    "type": "Streetwear",
    "price": 2490,
    "description": "A timeless classic that defines streetwear culture. Features premium leather overlays and encapsulated Air-Sole cushioning.",
    "features": ["Encapsulated Air-Sole", "Classic perforated toe"],
    "variants": [
      { "variant_name": "Grey Red Swoosh", "color": "#F5F5F5", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.32 AM (1).jpeg"] },
      { "variant_name": "Olive Gum Suede", "color": "#556B2F", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.34 AM (1).jpeg"] },
      { "variant_name": "Beige Navy Shadow", "color": "#D2B48C", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.34 AM.jpeg"] }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  },
  {
    "name": "Jordan 1 Low / Court",
    "brand": "Jordan",
    "model": "Retro Low",
    "slug": "jordan-retro-low",
    "category": "sneakers",
    "type": "Streetwear",
    "price": 2990,
    "description": "A fusion of basketball heritage and high-street aesthetics in a low-cut silhouette.",
    "features": ["Low-profile design", "Multi-textured overlays"],
    "variants": [
      { "variant_name": "Navy Dior", "color": "#303F9F", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.31 AM (2).jpeg"] },
      { "variant_name": "Electric Blue Fragment", "color": "#0D47A1", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.33 AM (2).jpeg"] },
      { "variant_name": "Forest Green", "color": "#2E7D32", "images": ["/real-images/WhatsApp Image 2026-04-26 at 10.55.33 AM.jpeg"] }
    ],
    "care_instructions": ["Clean with soft brush", "Air dry only"]
  }
];

const SIZES = ['7', '8', '9', '10', '11', '12'];

async function seed() {
  console.log('Seeding audited product catalog...');

  // Clear products to avoid duplicates or stale data
  await db.delete(cartItems);
  await db.delete(orderItems);
  await db.delete(productSizes);
  await db.delete(productVariantImages);
  await db.delete(productVariants);
  await db.delete(products);

  for (const p of catalog) {
    try {
      const productId = randomUUID();
      await db.insert(products).values({
        id: productId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        imageUrl: p.variants[0].images[0],
        category: p.category,
        featured: true,
        features: JSON.stringify(p.features),
        careInstructions: JSON.stringify(p.care_instructions)
      });

      for (const v of p.variants) {
        const variantId = randomUUID();
        await db.insert(productVariants).values({
          id: variantId,
          productId,
          name: v.variant_name,
          color: v.color,
          slug: `${p.slug}-${v.variant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        });

        for (const img of v.images) {
          await db.insert(productVariantImages).values({
            id: randomUUID(),
            variantId,
            imageUrl: img
          });
        }

        for (const size of SIZES) {
          await db.insert(productSizes).values({
            id: randomUUID(),
            variantId,
            size,
            stock: Math.floor(Math.random() * 50) + 10
          });
        }
      }
      console.log(`- Created product: ${p.name}`);
    } catch (error: any) {
      console.error(`- Failed to create product ${p.name}:`, error.message);
    }
  }

  console.log('Seed complete!');
}

seed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
