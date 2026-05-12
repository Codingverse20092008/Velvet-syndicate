import { reviewRepository } from '../repositories/review.repository';
import { logger } from '../lib/logger';
import { reviews } from '../lib/schema';
import { sql } from 'drizzle-orm';

// Fake user data for generating reviews
const FAKE_NAMES = [
  'Priyanush', 'Dipti', 'Rohan', 'Ananya', 'Ishaan', 'Meera', 'Vikram', 'Saira', 'Arjun', 'Kavya',
  'Rahul', 'Sneha', 'Abhishek', 'Pooja', 'Sameer', 'Nisha', 'Aravind', 'Aditi', 'Karthik', 'Riya',
  'Siddharth', 'Zoya', 'Aryan', 'Myra', 'Kabir', 'Kiara', 'Ayaan', 'Shanaya', 'Reyansh', 'Anvi'
];

const FAKE_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
];

const GOOD_REVIEW_TEMPLATES = [
  {
    title: 'Excellent Quality!',
    content: 'Amazing product! The quality is outstanding and it exceeded my expectations. Would definitely recommend to others.',
    rating: 5
  },
  {
    title: 'Very Satisfied',
    content: 'Really happy with this purchase. Great value for money and the product looks exactly as described.',
    rating: 5
  },
  {
    title: 'Perfect Fit',
    content: 'Perfect size and comfortable to wear. The material feels premium and durable.',
    rating: 4
  },
  {
    title: 'Great Purchase',
    content: 'Good quality product, fast delivery, and excellent customer service. Very satisfied!',
    rating: 4
  },
  {
    title: 'Love It!',
    content: 'Absolutely love this product! The design is stylish and the quality is top-notch.',
    rating: 5
  }
];

const MODERATE_REVIEW_TEMPLATES = [
  {
    title: 'Good Product',
    content: 'Nice product overall. Quality is good but could be better for the price. Still satisfied with the purchase.',
    rating: 3
  },
  {
    title: 'Decent Quality',
    content: 'Product is okay for the price. Nothing extraordinary but does the job well.',
    rating: 3
  },
  {
    title: 'Average Experience',
    content: 'Product is what you expect for this price range. Quality is decent and delivery was on time.',
    rating: 3
  },
  {
    title: 'Satisfied',
    content: 'Good value for money. Some minor issues but overall happy with the purchase.',
    rating: 4
  },
  {
    title: 'Acceptable',
    content: 'Product meets basic expectations. Could use some improvements but not bad overall.',
    rating: 3
  }
];

export class ReviewService {
  // Get reviews for a product
  async getProductReviews(productId: string, filters: { isFake?: boolean; limit?: number; offset?: number } = {}) {
    try {
      const reviews = await reviewRepository.findByProductId(productId, filters);
      const stats = await reviewRepository.getReviewStats(productId);
      
      return {
        reviews,
        stats,
        pagination: {
          limit: filters.limit || 20,
          offset: filters.offset || 0,
          hasMore: reviews.length === (filters.limit || 20)
        }
      };
    } catch (error) {
      logger.error({ error, productId }, 'Failed to get product reviews');
      throw error;
    }
  }

  // Get all reviews (for admin)
  async getAllReviews(filters: { isFake?: boolean; rating?: number; limit?: number; offset?: number } = {}) {
    try {
      const reviews = await reviewRepository.findMany(filters);
      return {
        reviews,
        pagination: {
          limit: filters.limit || 50,
          offset: filters.offset || 0,
          hasMore: reviews.length === (filters.limit || 50)
        }
      };
    } catch (error) {
      logger.error({ error, filters }, 'Failed to get all reviews');
      throw error;
    }
  }

  // Create a new review (real user)
  async createReview(data: {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    content: string;
  }) {
    try {
      const review = await reviewRepository.create({
        ...data,
        isFake: false,
      });
      
      logger.info({ reviewId: review.id, productId: data.productId, userId: data.userId }, 'Real review created');
      return review;
    } catch (error) {
      logger.error({ error, data }, 'Failed to create review');
      throw error;
    }
  }

  // Generate fake reviews for products due for reviews (2-day rule)
  async generateFakeReviews() {
    try {
      logger.info('Starting precise 2-day fake review generation');
      
      // Find products that were created exactly 2 days ago and have no reviews
      const productsDueForReviews = await reviewRepository.findProductsDueForReviews();
      
      if (productsDueForReviews.length === 0) {
        logger.info('No products are due for reviews today (2-day rule)');
        return { generated: 0, message: 'No products due for reviews today', type: 'scheduled' };
      }

      let totalGenerated = 0;
      
      for (const product of productsDueForReviews) {
        // Generate 3 fake reviews per product
        for (let i = 0; i < 3; i++) {
          const isGoodReview = Math.random() > 0.3; // 70% good reviews, 30% moderate
          const template = isGoodReview 
            ? GOOD_REVIEW_TEMPLATES[Math.floor(Math.random() * GOOD_REVIEW_TEMPLATES.length)]
            : MODERATE_REVIEW_TEMPLATES[Math.floor(Math.random() * MODERATE_REVIEW_TEMPLATES.length)];
          
          const fakeName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
          const fakeAvatar = FAKE_AVATARS[Math.floor(Math.random() * FAKE_AVATARS.length)];
          
          await reviewRepository.create({
            productId: product.productId,
            rating: template.rating,
            title: template.title,
            content: template.content,
            isFake: true,
            fakeUserName: fakeName,
            fakeUserAvatar: fakeAvatar,
          });
          
          totalGenerated++;
        }
        
        const createdDate = new Date(product.createdAt);
        const dueDate = new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000);
        
        logger.info({ 
          productId: product.productId, 
          productName: product.productName,
          createdDate: createdDate.toISOString(),
          dueDate: dueDate.toISOString(),
          daysElapsed: Math.floor((Date.now() - createdDate.getTime()) / (24 * 60 * 60 * 1000))
        }, 'Generated 3 fake reviews for product (2-day rule)');
      }
      
      logger.info({ 
        totalGenerated, 
        productsCount: productsDueForReviews.length,
        type: 'scheduled_2_day_rule'
      }, 'Scheduled fake review generation completed');
      
      return {
        generated: totalGenerated,
        productsCount: productsDueForReviews.length,
        type: 'scheduled_2_day_rule',
        products: productsDueForReviews.map(p => ({ 
          id: p.productId, 
          name: p.productName,
          createdDate: p.createdAt,
          daysElapsed: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (24 * 60 * 60 * 1000))
        }))
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate scheduled fake reviews');
      throw error;
    }
  }

  // Generate fake reviews for existing products (manual/admin triggered)
  async generateFakeReviewsForExisting(limit: number = 3) {
    try {
      logger.info('Starting manual fake review generation for existing products');
      
      // Find ALL visible products that have fewer than 3 reviews
      const productsNeedingReviews = await reviewRepository.findProductsNeedingFakeReviews(limit);
      
      if (productsNeedingReviews.length === 0) {
        logger.info('All products have sufficient reviews (3+ reviews each)');
        return { generated: 0, message: 'All products have sufficient reviews', type: 'manual' };
      }

      let totalGenerated = 0;
      const existingProducts = [];
      const newProducts = [];
      
      for (const product of productsNeedingReviews) {
        // Check if product is new (created within last 7 days) or existing
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const isNew = new Date(product.createdAt) > sevenDaysAgo;
        
        if (isNew) {
          newProducts.push(product);
        } else {
          existingProducts.push(product);
        }
        
        // Generate 3 fake reviews per product
        for (let i = 0; i < 3; i++) {
          const isGoodReview = Math.random() > 0.3; // 70% good reviews, 30% moderate
          const template = isGoodReview 
            ? GOOD_REVIEW_TEMPLATES[Math.floor(Math.random() * GOOD_REVIEW_TEMPLATES.length)]
            : MODERATE_REVIEW_TEMPLATES[Math.floor(Math.random() * MODERATE_REVIEW_TEMPLATES.length)];
          
          const fakeName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
          const fakeAvatar = FAKE_AVATARS[Math.floor(Math.random() * FAKE_AVATARS.length)];
          
          await reviewRepository.create({
            productId: product.productId,
            rating: template.rating,
            title: template.title,
            content: template.content,
            isFake: true,
            fakeUserName: fakeName,
            fakeUserAvatar: fakeAvatar,
          });
          
          totalGenerated++;
        }
        
        logger.info({ 
          productId: product.productId, 
          productName: product.productName,
          isNew,
          currentReviews: product.reviewCount 
        }, 'Generated 3 fake reviews for product (manual)');
      }
      
      logger.info({ 
        totalGenerated, 
        productsCount: productsNeedingReviews.length,
        existingProductsCount: existingProducts.length,
        newProductsCount: newProducts.length,
        type: 'manual'
      }, 'Manual fake review generation completed');
      
      return {
        generated: totalGenerated,
        productsCount: productsNeedingReviews.length,
        existingProductsCount: existingProducts.length,
        newProductsCount: newProducts.length,
        type: 'manual',
        products: productsNeedingReviews.map(p => ({ 
          id: p.productId, 
          name: p.productName,
          currentReviews: p.reviewCount,
          isNew: new Date(p.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }))
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate manual fake reviews');
      throw error;
    }
  }

  // Generate fake reviews for recently added products (next day)
  // Note: Only works with admin-added products through the admin dashboard
  async generateReviewsForNewProducts() {
    try {
      logger.info('Checking for recently admin-added products');
      
      const recentProducts = await reviewRepository.findRecentlyAddedProducts();
      
      if (recentProducts.length === 0) {
        logger.info('No recently admin-added products found for review generation');
        return { generated: 0, message: 'No recently admin-added products found' };
      }

      let totalGenerated = 0;
      
      for (const product of recentProducts) {
        // Generate 2-3 fake reviews for recently admin-added products
        const reviewCount = Math.floor(Math.random() * 2) + 2; // 2-3 reviews
        
        for (let i = 0; i < reviewCount; i++) {
          const isGoodReview = Math.random() > 0.2; // 80% good reviews for new products
          const template = isGoodReview 
            ? GOOD_REVIEW_TEMPLATES[Math.floor(Math.random() * GOOD_REVIEW_TEMPLATES.length)]
            : MODERATE_REVIEW_TEMPLATES[Math.floor(Math.random() * MODERATE_REVIEW_TEMPLATES.length)];
          
          const fakeName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
          const fakeAvatar = FAKE_AVATARS[Math.floor(Math.random() * FAKE_AVATARS.length)];
          
          await reviewRepository.create({
            productId: product.id,
            rating: template.rating,
            title: template.title,
            content: template.content,
            isFake: true,
            fakeUserName: fakeName,
            fakeUserAvatar: fakeAvatar,
          });
          
          totalGenerated++;
        }
        
        logger.info({ productId: product.id, productName: product.name, reviewCount }, 'Generated fake reviews for recently admin-added product');
      }
      
      logger.info({ totalGenerated, productsCount: recentProducts.length }, 'Recently admin-added product review generation completed');
      
      return {
        generated: totalGenerated,
        productsCount: recentProducts.length,
        products: recentProducts.map(p => ({ id: p.id, name: p.name }))
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate reviews for recently admin-added products');
      throw error;
    }
  }

  // Update a review
  async updateReview(id: string, updateData: { rating?: number; title?: string; content?: string }) {
    try {
      const review = await reviewRepository.update(id, updateData);
      logger.info({ reviewId: id, updateData }, 'Review updated');
      return review;
    } catch (error) {
      logger.error({ error, reviewId: id }, 'Failed to update review');
      throw error;
    }
  }

  // Delete a review
  async deleteReview(id: string) {
    try {
      await reviewRepository.delete(id);
      logger.info({ reviewId: id }, 'Review deleted');
      return { success: true };
    } catch (error) {
      logger.error({ error, reviewId: id }, 'Failed to delete review');
      throw error;
    }
  }

  // Mark review as helpful
  async markReviewHelpful(id: string) {
    try {
      // First get current helpful count, then increment
      const currentReview = await reviewRepository.findById(id);
      if (!currentReview) {
        throw new Error('Review not found');
      }
      
      const review = await reviewRepository.update(id, {
        helpfulCount: (currentReview.helpfulCount || 0) + 1
      });
      logger.info({ reviewId: id }, 'Review marked as helpful');
      return review;
    } catch (error) {
      logger.error({ error, reviewId: id }, 'Failed to mark review as helpful');
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
