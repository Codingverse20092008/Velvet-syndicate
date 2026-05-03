import { getAdminProducts, updateAdminProduct } from './src/services/admin.service';

async function fixFootwearSizes() {
  const products = await getAdminProducts();
  const targetSizes = '6,7,8,9,10,11,12';
  let count = 0;
  
  for (const p of products) {
    if (p.sizes === 'Standard' || !p.sizes) {
      await updateAdminProduct(p.id, { sizes: targetSizes, stock: 70 }); // 70 total stock to give 10 per size
      console.log('Updated sizes for:', p.name);
      count++;
    }
  }
  console.log('Total products updated with full sizes:', count);
  process.exit(0);
}

fixFootwearSizes().catch(console.error);
