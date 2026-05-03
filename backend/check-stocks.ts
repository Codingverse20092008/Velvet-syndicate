import { getAdminProducts } from './src/services/admin.service';

async function checkStocks() {
  const products = await getAdminProducts();
  const zeroStock = products.filter(p => p.stock === 0);
  console.log('0 stock products:', zeroStock.length);
  process.exit(0);
}

checkStocks().catch(console.error);
