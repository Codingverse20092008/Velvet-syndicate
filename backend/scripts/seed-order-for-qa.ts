import { db } from '../src/lib/db';
import { orders, orderItems } from '../src/lib/schema';

async function main() {
  const [userId, name, phone, street, city, state, pincode] = process.argv.slice(2);
  if (!userId) throw new Error('missing userId');

  const orderId = crypto.randomUUID();
  const snapshot = JSON.stringify({ name, phone, street, city, state, pincode });

  await db.insert(orders).values({
    id: orderId,
    userId,
    totalAmount: 1999,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'COD',
    shippingAddress: snapshot,
    idempotencyKey: `seed-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  });

  await db.insert(orderItems).values({
    id: crypto.randomUUID(),
    orderId,
    productId: '334ff18f-4726-4a82-aed0-ac078a1c4e8d',
    productName: 'QA Audit Product',
    productPrice: 1999,
    quantity: 1,
    size: '9',
    variantId: 'da98029b-4101-4f2f-833b-c72a5aab4775',
    imageUrl: 'https://example.com/qa-product.jpg',
  });

  console.log(orderId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
