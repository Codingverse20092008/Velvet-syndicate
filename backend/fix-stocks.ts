import { getAdminProducts, updateAdminProduct } from './src/services/admin.service';
import { db } from './src/lib/db';

async function fixStocks() {
  const products = await getAdminProducts();
  let count = 0;
  for (const p of products) {
    if (p.stock === 0) {
      await updateAdminProduct(p.id, { stock: 10 });
      console.log('Fixed stock for:', p.name);
      count++;
    }
  }
  console.log('Total fixed:', count);
  process.exit(0);
}

fixStocks().catch(console.error);
