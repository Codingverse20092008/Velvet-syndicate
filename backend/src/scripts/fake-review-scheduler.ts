import { reviewService } from '../services/review.service';
import { logger } from '../lib/logger';

export class FakeReviewScheduler {
  private isRunning = false;
  private dailyInterval: NodeJS.Timeout | null = null;

  // Start the daily scheduler
  start() {
    if (this.isRunning) {
      logger.warn('Fake review scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting fake review scheduler');

    // Run immediately on start (if conditions are met)
    this.scheduleDailyRun();

    // Set up daily interval - run every 24 hours
    this.dailyInterval = setInterval(() => {
      this.scheduleDailyRun();
    }, 24 * 60 * 60 * 1000); // 24 hours

    logger.info('Fake review scheduler started - will run daily');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      logger.warn('Fake review scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
      this.dailyInterval = null;
    }

    logger.info('Fake review scheduler stopped');
  }

  // Schedule the daily run for optimal time (e.g., 2 AM)
  private scheduleDailyRun() {
    const now = new Date();
    const targetTime = new Date();
    
    // Set to 2:00 AM next day
    targetTime.setDate(now.getDate() + 1);
    targetTime.setHours(2, 0, 0, 0);
    
    const timeUntilRun = targetTime.getTime() - now.getTime();
    
    logger.info({ nextRun: targetTime.toISOString() }, 'Scheduled next fake review generation');

    setTimeout(async () => {
      await this.performDailyGeneration();
    }, timeUntilRun);
  }

  // Perform the daily fake review generation (precise 2-day rule)
  private async performDailyGeneration() {
    try {
      logger.info('Starting daily 2-day rule fake review generation');

      // Generate fake reviews for products that are exactly 2 days old
      const result = await reviewService.generateFakeReviews();
      
      logger.info({ 
        totalGenerated: result.generated,
        productsProcessed: result.generated,
        type: result.type
      }, 'Daily 2-day rule review generation completed');

      // Log summary for monitoring
      if (result.generated > 0) {
        console.log(`📝 2-Day Rule Review Generation:
✅ Total Reviews Generated: ${result.generated}
📦 Products Processed: ${result.generated}
⏰ Rule Applied: Products added exactly 2 days ago
📅 Next Run: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}`);
        
        // Show individual products
        // Product details not available in simplified response
      } else {
        console.log(`📝 2-Day Rule Review Generation:
ℹ️ No products due for reviews today
📅 Next Run: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}`);
      }

    } catch (error) {
      logger.error({ error }, 'Daily 2-day rule review generation failed');
      console.error('❌ 2-day rule review generation failed:', error);
    }
  }

  // Manual trigger for testing or immediate generation
  async triggerManualGeneration() {
    logger.info('Manual fake review generation triggered');
    return await this.performDailyGeneration();
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    };
  }
}

// Singleton instance
export const fakeReviewScheduler = new FakeReviewScheduler();
