/**
 * Script to clear product cache
 */

const { redis } = require('./dist/src/lib/redis');

async function clearCache() {
  try {
    // Clear all product-related cache keys
    await redis.del('products:featured');
    await redis.del('products:list:*');
    console.log('Cache cleared successfully!');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

clearCache();
