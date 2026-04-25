import { Redis } from '@upstash/redis';
import { env } from './env';
import { logger } from './logger';

// Queue configuration
type Job = {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  scheduledFor: string;
  [key: string]: unknown; // Index signature for Record constraint
}

type JobType =
  | 'email.signup'
  | 'email.order_confirmation'
  | 'email.password_reset'
  | 'analytics.track'
  | 'order.process'
  | 'cart.abandoned';

// Redis client for queue
let queueRedis: Redis | null = null;

if (env.QUEUE_REDIS_URL && env.QUEUE_REDIS_TOKEN) {
  queueRedis = new Redis({
    url: env.QUEUE_REDIS_URL,
    token: env.QUEUE_REDIS_TOKEN,
  });
} else if (env.REDIS_URL && env.REDIS_TOKEN) {
  // Fallback to main Redis
  queueRedis = new Redis({
    url: env.REDIS_URL,
    token: env.REDIS_TOKEN,
  });
}

const QUEUE_KEY = 'queue:jobs';
const DEAD_LETTER_KEY = 'queue:dead_letter';
const PROCESSING_KEY = 'queue:processing';

// Job priorities
const PRIORITIES: Record<JobType, number> = {
  'email.signup': 1, // High priority
  'email.order_confirmation': 1,
  'email.password_reset': 1,
  'order.process': 2,
  'analytics.track': 3,
  'cart.abandoned': 5, // Low priority
};

export class JobQueue {
  private redis: Redis | null;
  private handlers: Map<JobType, (payload: Record<string, unknown>) => Promise<void>>;

  constructor() {
    this.redis = queueRedis;
    this.handlers = new Map();
  }

  // Register a job handler
  on(type: JobType, handler: (payload: Record<string, unknown>) => Promise<void>): void {
    this.handlers.set(type, handler);
  }

  // Add a job to the queue
  async add(
    type: JobType,
    payload: Record<string, unknown>,
    options: { delay?: number; priority?: number } = {}
  ): Promise<string> {
    if (!this.redis) {
      // If no Redis, execute immediately in development
      if (env.NODE_ENV === 'development') {
        const handler = this.handlers.get(type);
        if (handler) {
          handler(payload).catch((err) => {
            logger.error({ err, type, payload }, 'Immediate job execution failed');
          });
        }
      }
      return 'immediate-' + Date.now();
    }

    const job: Job = {
      id: `${type}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority: options.priority ?? PRIORITIES[type] ?? 5,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      scheduledFor: options.delay
        ? new Date(Date.now() + options.delay).toISOString()
        : new Date().toISOString(),
    };

    try {
      // Store job data
      await this.redis.hset(`job:${job.id}`, job as unknown as Record<string, unknown>);

      // Add to sorted set by priority and scheduled time
      const score = job.priority * 1000000000000 + Date.parse(job.scheduledFor);
      await this.redis.zadd(QUEUE_KEY, { score, member: job.id });

      logger.info({ jobId: job.id, type, priority: job.priority }, 'Job added to queue');
      return job.id;
    } catch (err) {
      logger.error({ err, type, payload }, 'Failed to add job to queue');
      throw err;
    }
  }

  // Process jobs from the queue
  async process(batchSize = 10): Promise<number> {
    if (!this.redis) return 0;

    let processed = 0;

    try {
      // Get jobs that are ready to process (scheduledFor <= now)
      const now = Date.now();
      const jobIds = await this.redis.zrange(QUEUE_KEY, 0, now, {
        byScore: true,
      });

      if (!Array.isArray(jobIds) || jobIds.length === 0) return 0;

      for (const jobId of jobIds.slice(0, batchSize)) {
        const id = String(jobId);
        // Move to processing set
        await this.redis.zrem(QUEUE_KEY, id);
        await this.redis.zadd(PROCESSING_KEY, { score: now, member: id });

        try {
          // Get job data
          const jobData = await this.redis.hgetall<Job>(`job:${id}`);
          if (!jobData) continue;

          const job = jobData as unknown as Job;
          const handler = this.handlers.get(job.type);

          if (!handler) {
            logger.warn({ jobId: id, type: job.type }, 'No handler for job type');
            continue;
          }

          // Execute handler
          await handler(job.payload);

          // Remove from processing and delete job data
          await this.redis.zrem(PROCESSING_KEY, id);
          await this.redis.del(`job:${id}`);

          processed++;
          logger.info({ jobId: id, type: job.type }, 'Job completed successfully');
        } catch (err) {
          await this.handleJobFailure(id, err as Error);
        }
      }
    } catch (err) {
      logger.error({ err }, 'Queue processing error');
    }

    return processed;
  }

  // Handle job failure with retry logic
  private async handleJobFailure(jobId: string, error: Error): Promise<void> {
    if (!this.redis) return;

    try {
      const jobData = await this.redis.hgetall<Job>(`job:${jobId}`);
      if (!jobData) return;

      const job = jobData as unknown as Job;
      job.attempts++;

      logger.error({
        jobId,
        type: job.type,
        attempts: job.attempts,
        error: error.message,
      }, 'Job failed');

      if (job.attempts >= job.maxAttempts) {
        // Move to dead letter queue
        await this.redis.zadd(DEAD_LETTER_KEY, { score: Date.now(), member: jobId });
        await this.redis.hset(`job:${jobId}:error`, {
          error: error.message,
          failedAt: new Date().toISOString(),
        });
        await this.redis.zrem(PROCESSING_KEY, jobId);

        logger.error({ jobId, type: job.type }, 'Job moved to dead letter queue');
      } else {
        // Retry with exponential backoff
        const delay = Math.pow(2, job.attempts) * 1000; // 2s, 4s, 8s
        job.scheduledFor = new Date(Date.now() + delay).toISOString();

        await this.redis.hset(`job:${jobId}`, job as unknown as Record<string, unknown>);
        const score = job.priority * 1000000000000 + Date.parse(job.scheduledFor);
        await this.redis.zadd(QUEUE_KEY, { score, member: jobId });
        await this.redis.zrem(PROCESSING_KEY, jobId);

        logger.info({ jobId, delay, attempt: job.attempts }, 'Job scheduled for retry');
      }
    } catch (err) {
      logger.error({ err, jobId }, 'Failed to handle job failure');
    }
  }

  // Get queue statistics
  async getStats(): Promise<{
    pending: number;
    processing: number;
    deadLetter: number;
  }> {
    if (!this.redis) return { pending: 0, processing: 0, deadLetter: 0 };

    const [pending, processing, deadLetter] = await Promise.all([
      this.redis.zcard(QUEUE_KEY),
      this.redis.zcard(PROCESSING_KEY),
      this.redis.zcard(DEAD_LETTER_KEY),
    ]);

    return {
      pending,
      processing,
      deadLetter,
    };
  }

  // Start continuous processing
  start(intervalMs = 5000): void {
    logger.info({ intervalMs }, 'Job queue processor started');

    const processLoop = async () => {
      try {
        await this.process(10);
      } catch (err) {
        logger.error({ err }, 'Queue processor error');
      }

      setTimeout(processLoop, intervalMs);
    };

    processLoop();
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Helper functions for common job types
export async function sendEmail(
  type: 'signup' | 'order_confirmation' | 'password_reset',
  payload: { to: string; [key: string]: unknown }
): Promise<string> {
  return jobQueue.add(`email.${type}` as JobType, payload);
}

export async function trackAnalytics(
  event: string,
  payload: Record<string, unknown>
): Promise<string> {
  return jobQueue.add('analytics.track', { event, ...payload }, { priority: 5 });
}

export async function processOrder(orderId: string): Promise<string> {
  return jobQueue.add('order.process', { orderId }, { priority: 2 });
}

export async function scheduleAbandonedCartEmail(userId: string, delay = 3600000): Promise<string> {
  return jobQueue.add('cart.abandoned', { userId }, { delay, priority: 5 });
}
