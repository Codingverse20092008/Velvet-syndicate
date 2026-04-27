
import { db } from '../backend/src/lib/db';
import { products } from '../backend/src/lib/schema';

async function checkProducts() {
  const allProducts = await db.select().from(products);
  console.log('Products in DB:', JSON.stringify(allProducts, null, 2));
}

checkProducts().catch(console.error);
