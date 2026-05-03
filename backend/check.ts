import { db } from './src/lib/db';
import { productSizes } from './src/lib/schema';

async function check() {
  const sizes = await db.select().from(productSizes);
  console.log([...new Set(sizes.map(s => s.size))]);
  process.exit(0);
}
check();
