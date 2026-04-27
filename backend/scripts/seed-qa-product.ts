import { db } from '../src/lib/db';
import { products, productVariants, productSizes } from '../src/lib/schema';

async function main() {
  const now = Date.now();
  const pid = crypto.randomUUID();
  const vid = crypto.randomUUID();
  const sid = crypto.randomUUID();

  await db.insert(products).values({
    id: pid,
    name: `QA Audit Product ${now}`,
    slug: `qa-audit-product-${now}`,
    description: 'Synthetic product for backend QA automation',
    price: 1999,
    imageUrl: 'https://example.com/qa-product.jpg',
    brand: 'Velvet',
    category: 'footwear',
    featured: false,
    isVisible: true,
  });

  await db.insert(productVariants).values({
    id: vid,
    productId: pid,
    name: 'QA Black',
    color: 'Black',
    slug: `qa-black-${now}`,
  });

  await db.insert(productSizes).values({
    id: sid,
    variantId: vid,
    size: '9',
    stock: 20,
  });

  console.log(JSON.stringify({ productId: pid, variantId: vid, size: '9' }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

