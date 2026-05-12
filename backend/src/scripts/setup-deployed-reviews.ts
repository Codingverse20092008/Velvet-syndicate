import { db } from '../lib/db';
import { reviews, products } from '../lib/schema';
import { eq } from 'drizzle-orm';

const FAKE_NAMES = ['Priyanush', 'Dipti', 'Rohan', 'Ananya', 'Ishaan'];
const FAKE_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
];

const REVIEW_TEMPLATES = [
  { rating: 5, title: 'Excellent!', content: 'Great product, very satisfied with the purchase.' },
  { rating: 4, title: 'Good Quality', content: 'Nice product, good value for money.' },
  { rating: 3, title: 'Decent', content: 'Product is okay, meets expectations.' },
];

async function setupDeployedReviews() {
  try {
    console.log('Setting up reviews in deployed database...');
    
    // Check if reviews table exists
    const tableInfo = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'`);
    console.log('Reviews table exists:', tableInfo.length > 0);
    
    if (tableInfo.length === 0) {
      console.log('Creating reviews table...');
      // Create reviews table manually
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
      
      // Create indexes
      await db.run(`CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews(product_id)`);
      await db.run(`CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews(user_id)`);
      await db.run(`CREATE INDEX IF NOT EXISTS reviews_rating_idx ON reviews(rating)`);
      await db.run(`CREATE INDEX IF NOT EXISTS reviews_is_fake_idx ON reviews(is_fake)`);
      await db.run(`CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at)`);
      
      console.log('Reviews table created successfully');
    }
    
    // Get first few products
    const productsList = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .limit(3);
    
    console.log(`Found ${productsList.length} products`);
    
    if (productsList.length === 0) {
      console.log('No products found, exiting...');
      return;
    }
    
    // Check if reviews already exist
    const existingReviews = await db.select().from(reviews).limit(1);
    if (existingReviews.length > 0) {
      console.log('Reviews already exist, skipping creation');
      return;
    }
    
    let totalCreated = 0;
    
    for (const product of productsList) {
      console.log(`Creating reviews for product: ${product.name}`);
      
      // Create 2-3 reviews per product
      const reviewCount = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < reviewCount; i++) {
        const template = REVIEW_TEMPLATES[Math.floor(Math.random() * REVIEW_TEMPLATES.length)];
        const fakeName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
        const fakeAvatar = FAKE_AVATARS[Math.floor(Math.random() * FAKE_AVATARS.length)];
        
        await db.insert(reviews).values({
          id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: product.id,
          rating: template.rating,
          title: template.title,
          content: template.content,
          isFake: true,
          fakeUserName: fakeName,
          fakeUserAvatar: fakeAvatar,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        totalCreated++;
      }
    }
    
    console.log(`Successfully created ${totalCreated} test reviews`);
    
    // Verify reviews were created
    const allReviews = await db.select().from(reviews).limit(5);
    console.log(`Verification: Found ${allReviews.length} reviews in database`);
    
  } catch (error) {
    console.error('Error setting up reviews:', error);
  } finally {
    process.exit(0);
  }
}

setupDeployedReviews();
