import { seedProducts } from './src/services/product.service';
import { logger } from './src/lib/logger';

async function main() {
  try {
    logger.info('Starting database seed...');
    const result = await seedProducts();
    logger.info({ count: result.count }, 'Database seeded successfully');
  } catch (err) {
    logger.error({ err }, 'Seed failed');
  }
  process.exit(0);
}

main().catch(console.error);
