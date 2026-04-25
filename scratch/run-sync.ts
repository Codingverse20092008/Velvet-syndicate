import { syncProductsFromFolders } from '../lib/product-sync';
import { db } from '../lib/db';

async function main() {
  console.log('Running manual product sync...');
  try {
    const result = await syncProductsFromFolders();
    console.log('Sync Result:', result);
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
