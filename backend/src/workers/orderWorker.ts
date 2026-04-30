import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { createOrderInDB } from '../services/order.service';

const connection = new IORedis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * 🛠️ ORDER WORKER (Reliability Hardened)
 * Processes order creation with full traceability and crash recovery.
 */
export const orderWorker = new Worker(
  'order-processing',
  async (job: Job) => {
    const { userId, addressId, paymentMethod, idempotencyKey, expectedVersion, requestId } = job.data;
    
    // 🔍 TRACEABILITY: Link job to the original user request
    const log = logger.child({ 
      jobId: job.id, 
      requestId: requestId || 'async-worker', 
      userId, 
      idempotencyKey 
    });
    
    log.info('📦 Order processing started');
    const startTime = Date.now();
    
    try {
      const result = await createOrderInDB(
        userId,
        addressId,
        paymentMethod,
        idempotencyKey,
        expectedVersion,
        job.id,
        requestId
      );
      
      const duration = Date.now() - startTime;
      log.info({ durationMs: duration, orderId: result.id }, '✅ Order processing successful');
      
      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      log.error({ 
        durationMs: duration, 
        err: err.message,
        retryCount: job.attemptsMade 
      }, '❌ Order processing failed');
      
      throw err; // BullMQ handles exponential backoff
    }
  },
  { 
    connection, 
    concurrency: 10,
    stalledInterval: 30000, // Check for crashed workers every 30s
    maxStalledCount: 2      // Retry stalled jobs twice
  }
);

orderWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '🎉 Worker job completed');
});

orderWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, '💥 Worker job failed');
});

console.log('👷 Order Worker is standing by...');
