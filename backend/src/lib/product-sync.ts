import { db } from './db'
import { products } from './schema'

export async function syncProductsFromFolders() {
  const allProducts = await db.select().from(products)
  console.log(`Found ${allProducts.length} products in backend DB.`)
  if (allProducts.length > 0) {
    console.log('Sample products:', allProducts.slice(0, 5).map((product) => ({ id: product.id, name: product.name, slug: product.slug })))
  }
  return {
    synced: allProducts.length,
    message: 'Product sync is currently a database read operation. Add actual folder-to-db sync logic if needed.',
  }
}
