
import { db } from '../lib/db';
import { cartItems, cart } from '../lib/schema';

async function checkDb() {
  const items = await db.select().from(cartItems);
  console.log('Cart Items in DB:', JSON.stringify(items, null, 2));
  
  const carts = await db.select().from(cart);
  console.log('Carts in DB:', JSON.stringify(carts, null, 2));
}

checkDb();
