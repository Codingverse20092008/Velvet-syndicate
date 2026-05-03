import { getAdminProducts } from './src/services/admin.service';

async function checkSpecificImages() {
  const products = await getAdminProducts();
  const targetNames = [
    'Nike Dunk Low Multi-Color Graphic',
    'Nike Air Force 1 Low White Blue "Keep" Style',
    'Air Jordan 1 Low Travis Scott Olive Grey'
  ];
  
  console.log('Specific Product Images:');
  products.forEach(p => {
    if (targetNames.some(name => p.name.includes(name))) {
      console.log(`${p.name}: ${p.image}`);
    }
  });
  process.exit(0);
}

checkSpecificImages().catch(console.error);
