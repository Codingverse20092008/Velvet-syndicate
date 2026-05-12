import { db } from '../lib/db';
import { reviews, products, users } from '../lib/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export interface ReviewFilters {
  productId?: string;
  isFake?: boolean;
  rating?: number;
  limit?: number;
  offset?: number;
}

export class ReviewRepository {
  // Find reviews by product ID
  async findByProductId(productId: string, filters: ReviewFilters = {}) {
    const { limit = 20, offset = 0, isFake } = filters;
    
    const conditions = [eq(reviews.productId, productId)];
    if (typeof isFake === 'boolean') {
      conditions.push(eq(reviews.isFake, isFake));
    }

    return await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        rating: reviews.rating,
        title: reviews.title,
        content: reviews.content,
        isFake: reviews.isFake,
        isVerified: reviews.isVerified,
        helpfulCount: reviews.helpfulCount,
        fakeUserName: reviews.fakeUserName,
        fakeUserAvatar: reviews.fakeUserAvatar,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        productName: products.name,
        userName: users.name,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Find all reviews with filters
  async findMany(filters: ReviewFilters = {}) {
    const { productId, isFake, rating, limit = 50, offset = 0 } = filters;
    
    const conditions = [];
    if (productId) conditions.push(eq(reviews.productId, productId));
    if (typeof isFake === 'boolean') conditions.push(eq(reviews.isFake, isFake));
    if (rating) conditions.push(eq(reviews.rating, rating));

    return await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        rating: reviews.rating,
        title: reviews.title,
        content: reviews.content,
        isFake: reviews.isFake,
        isVerified: reviews.isVerified,
        helpfulCount: reviews.helpfulCount,
        fakeUserName: reviews.fakeUserName,
        fakeUserAvatar: reviews.fakeUserAvatar,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        productName: products.name,
        userName: users.name,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Create a new review
  async create(reviewData: {
    productId: string;
    userId?: string;
    rating: number;
    title?: string;
    content: string;
    isFake?: boolean;
    fakeUserName?: string;
    fakeUserAvatar?: string;
  }) {
    const [review] = await db.insert(reviews).values({
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...reviewData,
      isFake: reviewData.isFake || false,
    }).returning();

    return review;
  }

  // Update a review
  async update(id: string, updateData: Partial<{
    rating: number;
    title: string;
    content: string;
    helpfulCount: number;
  }>) {
    const [review] = await db
      .update(reviews)
      .set({ ...updateData, updatedAt: new Date().toISOString() })
      .where(eq(reviews.id, id))
      .returning();

    return review;
  }

  // Find review by ID
  async findById(id: string) {
    const result = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  // Delete a review
  async delete(id: string) {
    return await db.delete(reviews).where(eq(reviews.id, id));
  }

  // Get review statistics for a product
  async getReviewStats(productId: string) {
    const stats = await db
      .select({
        totalReviews: sql<number>`count(*)`.mapWith(Number),
        averageRating: sql<number>`avg(${reviews.rating})`.mapWith(Number),
        ratingDistribution: sql<any>`json_group_array(
          json_object(
            'rating', ${reviews.rating},
            'count', count(*)
          )
        )`,
        fakeReviews: sql<number>`sum(case when ${reviews.isFake} = 1 then 1 else 0 end)`.mapWith(Number),
        realReviews: sql<number>`sum(case when ${reviews.isFake} = 0 then 1 else 0 end)`.mapWith(Number),
      })
      .from(reviews)
      .where(eq(reviews.productId, productId));

    return stats[0] || {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: [],
      fakeReviews: 0,
      realReviews: 0,
    };
  }

  // Find products that are due for fake reviews (exactly 2 days after creation)
  async findProductsDueForReviews() {
    // Find products that were created exactly 2 days ago and have no reviews yet
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const twoDaysAgoStart = new Date(twoDaysAgo);
    twoDaysAgoStart.setHours(0, 0, 0, 0); // Start of the day 2 days ago
    const twoDaysAgoEnd = new Date(twoDaysAgo);
    twoDaysAgoEnd.setHours(23, 59, 59, 999); // End of the day 2 days ago
    
    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        createdAt: products.createdAt,
        reviewCount: sql<number>`(
          SELECT count(*) 
          FROM ${reviews} 
          WHERE ${reviews.productId} = ${products.id}
        )`.mapWith(Number),
      })
      .from(products)
      .where(
        and(
          eq(products.isVisible, true),
          sql`${products.createdAt} >= ${twoDaysAgoStart.toISOString()}`,
          sql`${products.createdAt} <= ${twoDaysAgoEnd.toISOString()}`,
          sql`(
            SELECT count(*) 
            FROM ${reviews} 
            WHERE ${reviews.productId} = ${products.id}
          ) = 0`
        )
      );

    return result;
  }

  // Find products that need fake reviews (existing products without reviews)
  async findProductsNeedingFakeReviews(limit: number = 3) {
    // Find ALL visible products (both old and new) that have fewer than 3 reviews
    // This ensures existing products get reviews too
    
    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        createdAt: products.createdAt,
        reviewCount: sql<number>`(
          SELECT count(*) 
          FROM ${reviews} 
          WHERE ${reviews.productId} = ${products.id}
        )`.mapWith(Number),
      })
      .from(products)
      .where(
        and(
          eq(products.isVisible, true),
          sql`(
            SELECT count(*) 
            FROM ${reviews} 
            WHERE ${reviews.productId} = ${products.id}
          ) < 3`
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return result;
  }

  // Find recently added products (for next day's fake reviews)
  async findRecentlyAddedProducts() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    
    return await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(
        and(
          sql`${products.createdAt} >= ${oneDayAgo}`,
          sql`${products.createdAt} < ${now}`,
          eq(products.isVisible, true)
        )
      )
      .orderBy(desc(products.createdAt));
  }
}

export const reviewRepository = new ReviewRepository();
