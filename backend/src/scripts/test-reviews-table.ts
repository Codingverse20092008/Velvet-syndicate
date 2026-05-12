import { db } from '../lib/db';
import { reviews } from '../lib/schema';

async function testReviewsTable() {
  try {
    console.log('Testing reviews table...');
    
    // Check if table exists
    const tableInfo = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'`);
    console.log('Reviews table exists:', tableInfo.length > 0);
    
    if (tableInfo.length > 0) {
      // Get table structure
      const columns = await db.all(`PRAGMA table_info(reviews)`);
      console.log('Table columns:', columns);
      
      // Count reviews
      const count = await db.select().from(reviews);
      console.log('Total reviews in database:', count.length);
      
      // Show first few reviews
      const sampleReviews = await db.select().from(reviews).limit(3);
      console.log('Sample reviews:', sampleReviews);
    }
    
  } catch (error) {
    console.error('Error testing reviews table:', error);
  } finally {
    process.exit(0);
  }
}

testReviewsTable();
