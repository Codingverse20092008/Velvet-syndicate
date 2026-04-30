import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { createOrderInDB } from '../services/order.service';

const useRedis = env.REDIS_URL && (env.REDIS_URL.startsWith('redis://') || env.REDIS_URL.startsWith('rediss://'));

const connection = useRedis 
  ? new IORedis(env.REDIS_URL!, { maxRetriesPerRequest: null }) 
  : null;

/**
 * 🛠️ ORDER WORKER (Resilient)
 * Only starts if Redis is available.
 */
export const orderWorker = (useRedis && connection) ? new Worker(
  'order-processing',
  async (job: Job) => {
    // ... same logic ...
    const { userId, addressId, paymentMethod, idempotencyKey, expectedVersion, requestId } = job.data;
    const log = logger.child({ jobId: job.id, requestId: requestId || 'async-worker', userId, idempotencyKey });
    log.info('📦 Order processing started');
    const startTime = Date.now();
    
    try {
      const result = await createOrderInDB(userId, addressId, paymentMethod, idempotencyKey, expectedVersion, job.id, requestId);
      log.info({ durationMs: Date.now() - startTime, orderId: result.id }, '✅ Order processing successful');
      return result;
    } catch (err: any) {
      log.error({ durationMs: Date.now() - startTime, err: err.message, retryCount: job.attemptsMade }, '❌ Order processing failed');
      throw err;
    }
  },
  { 
    connection, 
    concurrency: 10,
    stalledInterval: 30000,
    maxStalledCount: 2
  }
) : null;

if (orderWorker) {
  orderWorker.on('completed', (job) => logger.info({ jobId: job.id }, '🎉 Worker job completed'));
  orderWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, '💥 Worker job failed'));
  console.log('👷 Order Worker is standing by...');
} else {
  logger.warn('⚠️ Order Worker Disabled (Redis not configured)');
}
