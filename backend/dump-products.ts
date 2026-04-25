import { db } from './src/lib/db';
import { products } from './src/lib/schema';

async function main() {
  const allProducts = await db.select().from(products);
  console.log(JSON.stringify(allProducts, null, 2));
  process.exit(0);
}

main().catch(console.error);
