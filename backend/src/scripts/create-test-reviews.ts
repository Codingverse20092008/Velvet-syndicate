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

async function createTestReviews() {
  try {
    console.log('Creating test reviews...');
    
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
    console.error('Error creating test reviews:', error);
  } finally {
    process.exit(0);
  }
}

createTestReviews();
