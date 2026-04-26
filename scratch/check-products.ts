
import { db } from '../lib/db';
import { products } from '../lib/schema';

async function checkProducts() {
  const allProducts = await db.select().from(products);
  console.log('Products in DB:', JSON.stringify(allProducts, null, 2));
}

checkProducts().catch(console.error);
