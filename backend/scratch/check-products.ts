import { db } from '../src/lib/db';
import { products } from '../src/lib/schema';

async function main() {
  console.log('Fetching products...');
  const allProducts = await db.select().from(products);
  console.log('Products:', JSON.stringify(allProducts, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
