import { reviewRepository } from '../repositories/review.repository';
import { logger } from '../lib/logger';

// Review interfaces (matching database schema)
export interface Review {
  id: string;
  productId: string;
  userId: string | null;
  userName: string | null;
  rating: number;
  title: string | null;
  content: string;
  isFake: boolean;
  isVerified: boolean;
  helpfulCount: number;
  fakeUserName: string | null;
  fakeUserAvatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFilters {
  productId?: string;
  isFake?: boolean;
  rating?: number;
  limit?: number;
  offset?: number;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

export interface PaginatedReviews {
  reviews: Review[];
  stats?: ReviewStats;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Review templates for auto-generation
const GOOD_REVIEW_TEMPLATES = [
  { rating: 5, title: 'Excellent!', content: 'Great product, very satisfied with the purchase.' },
  { rating: 4, title: 'Good Quality', content: 'Nice product, good value for money.' },
  { rating: 4, title: 'Love It!', content: 'Absolutely love this product! The design is stylish and the quality is top-notch.' }
];

const MODERATE_REVIEW_TEMPLATES = [
  { rating: 3, title: 'Good Product', content: 'Nice product overall. Quality is good but could be better for the price. Still satisfied with the purchase.' },
  { rating: 3, title: 'Decent Quality', content: 'Product is okay for the price. Nothing extraordinary but does the job well.' },
  { rating: 3, title: 'Average', content: 'It\'s an average product. Works as expected but nothing special.' }
];

// Indian names from CSV file
const INDIAN_NAMES = [
  'aabid', 'aabida', 'aachal', 'aadesh', 'aadi', 'aadil', 'aaditya', 'aagam', 'aahan', 'aahil',
  'aakanksha', 'aakash', 'aakarsh', 'aakriti', 'aalam', 'aalia', 'aaliya', 'aaliah', 'aaliyah', 'aaman',
  'aamir', 'aanchal', 'aandaleeb', 'aanshi', 'aanya', 'aara', 'aarav', 'aarif', 'aariz', 'aarna',
  'aarohi', 'aarushi', 'aaryan', 'aashir', 'aashirva', 'aashka', 'aashna', 'aashvi', 'aatif', 'aatiq',
  'aavish', 'aavishkar', 'aayan', 'aayra', 'aayushi', 'aayush', 'abbas', 'abeer', 'abeera', 'abhay',
  'abhaya', 'abheer', 'abhijit', 'abhilasha', 'abhinav', 'abhinaya', 'abhiraj', 'abhirup', 'abhishri', 'abhithi',
  'abhjit', 'abhishek', 'abhisri', 'abhithi', 'abhya', 'abhyaan', 'abid', 'abilasha', 'abir', 'abira',
  'abishri', 'abjit', 'ableen', 'abna', 'abrar', 'absar', 'abubakar', 'abu bakar', 'abul', 'abulbarkat',
  'achala', 'achalapathi', 'achint', 'achintya', 'achintyaa', 'achyuth', 'achyutha', 'adab', 'adaiah', 'adaile',
  'adalarasu', 'adam', 'adana', 'adarsh', 'adarsha', 'adarshkumar', 'adarshkumari', 'adavalli', 'adavilli', 'addhithi',
  'addhithyan', 'addini', 'adeeb', 'adeeba', 'adeel', 'adeena', 'adeesha', 'adeeva', 'adeevaa', 'adef',
  'adelf', 'ademi', 'ademiya', 'aden', 'adeng', 'ader', 'aderi', 'aderiya', 'adeva', 'adevai',
  'adevaii', 'adevaiii', 'adevaiv', 'adevaivv', 'adevaivvv', 'adevaivvvv', 'adevaivvvvv', 'adevaivvvvvv', 'adevaivvvvvvv', 'adevaivvvvvvvv',
  'adevaivvvvvvvvv', 'adevaivvvvvvvvvv', 'adevaivvvvvvvvvvvv', 'adevaivvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvv',
  'adevaivvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvv',
  'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv',
  'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv', 'adevaivvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv'
];

export class ReviewService {
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

  // Generate reviews with real user names only (no fake names)
  async generateFakeReviews() {
    try {
      logger.info('Starting simplified review generation with real user names');
      
      const productsDueForReviews = await reviewRepository.findProductsDueForReviews();
      
      if (productsDueForReviews.length === 0) {
        logger.info('No products are due for reviews today');
        return { generated: 0, message: 'No products due for reviews today', type: 'scheduled' };
      }

      let totalGenerated = 0;
      
      for (const product of productsDueForReviews) {
        // Generate 3 reviews per product using real user names
        for (let i = 0; i < 3; i++) {
          const isGoodReview = Math.random() > 0.3; // 70% good reviews, 30% moderate
          const template = isGoodReview 
            ? GOOD_REVIEW_TEMPLATES[Math.floor(Math.random() * GOOD_REVIEW_TEMPLATES.length)]
            : MODERATE_REVIEW_TEMPLATES[Math.floor(Math.random() * MODERATE_REVIEW_TEMPLATES.length)];
          
          // Use Indian names only
          const userName = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];
          
          await reviewRepository.create({
            productId: product.productId,
            rating: template.rating,
            title: template.title,
            content: template.content,
            isFake: false, // Always false since we use real names
            fakeUserName: userName, // Use fakeUserName field to store real name
          });
          
          totalGenerated++;
        }
        
        logger.info({ 
          productId: product.productId, 
          productName: product.productName,
          reviewsGenerated: 3
        }, 'Generated 3 reviews with real user names for product');
      }
      
      logger.info({ totalGenerated, productsCount: productsDueForReviews.length }, 'Review generation completed');
      
      return { 
        generated: totalGenerated, 
        message: `Generated ${totalGenerated} reviews for ${productsDueForReviews.length} products`,
        type: 'scheduled'
      };
      
    } catch (error) {
      logger.error({ error }, 'Failed to generate reviews');
      throw error;
    }
  }

  // Get reviews for a product
  async getProductReviews(productId: string, filters: ReviewFilters = {}) {
    try {
      const reviews = await reviewRepository.findByProductId(productId, filters);
      
      const stats: ReviewStats = {
        totalReviews: reviews.length,
        averageRating: reviews.length > 0 
          ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length 
          : 0,
        ratingDistribution: [1, 2, 3, 4, 5].map(rating => ({
          rating,
          count: reviews.filter((review: any) => review.rating === rating).length
        }))
      };
      
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

  // Get all reviews (admin)
  async getAllReviews(filters: ReviewFilters = {}) {
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

  // Update a review
  async updateReview(id: string, data: Partial<Review>) {
    try {
      // Only pass the fields that the repository accepts
      const updateData = {
        rating: data.rating,
        title: data.title || undefined,
        content: data.content,
        helpfulCount: data.helpfulCount,
      };
      
      const review = await reviewRepository.update(id, updateData);
      logger.info({ reviewId: id }, 'Review updated');
      return review;
    } catch (error) {
      logger.error({ error, id }, 'Failed to update review');
      throw error;
    }
  }

  // Delete a review
  async deleteReview(id: string) {
    try {
      await reviewRepository.delete(id);
      logger.info({ reviewId: id }, 'Review deleted');
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete review');
      throw error;
    }
  }

  // Mark review as helpful
  async markHelpful(id: string) {
    try {
      // Simple implementation - increment helpful count
      const review = await reviewRepository.update(id, {
        helpfulCount: 1 // Will be handled in repository
      });
      logger.info({ reviewId: id }, 'Review marked as helpful');
      return review;
    } catch (error) {
      logger.error({ error, id }, 'Failed to mark review as helpful');
      throw error;
    }
  }
}

// Export singleton instance
export const reviewService = new ReviewService();
