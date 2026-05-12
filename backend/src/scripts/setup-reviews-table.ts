import { db } from '../lib/db';

async function setupReviewsTable() {
  try {
    console.log('Setting up reviews table...');
    
    // Create reviews table manually using raw SQL
    await db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id text PRIMARY KEY NOT NULL,
        product_id text NOT NULL,
        user_id text,
        rating integer NOT NULL,
        title text,
        content text NOT NULL,
        is_fake integer NOT NULL DEFAULT (false),
        is_verified integer NOT NULL DEFAULT (false),
        helpful_count integer NOT NULL DEFAULT (0),
        fake_user_name text,
        fake_user_avatar text,
        created_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE no action
      )
    `);
    
    console.log('Reviews table created successfully');
    
    // Create indexes
    await db.run(`CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews(product_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS reviews_rating_idx ON reviews(rating)`);
    await db.run(`CREATE INDEX IF NOT EXISTS reviews_is_fake_idx ON reviews(is_fake)`);
    await db.run(`CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at)`);
    
    console.log('Reviews indexes created successfully');
    
    // Verify table exists
    const result = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'`);
    console.log('Table verification:', result);
    
  } catch (error) {
    console.error('Error setting up reviews table:', error);
  } finally {
    process.exit(0);
  }
}

setupReviewsTable();
