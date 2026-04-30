import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const useRedis = env.REDIS_URL && (env.REDIS_URL.startsWith('redis://') || env.REDIS_URL.startsWith('rediss://'));

const connection = useRedis 
  ? new IORedis(env.REDIS_URL!, { maxRetriesPerRequest: null }) 
  : null;

if (connection) {
  connection.on('error', (err) => {
    logger.error({ err }, 'Redis Queue Connection Error');
  });
}

// 🎯 Order Processing Queue (Optional)
export const orderQueue = useRedis && connection 
  ? new Queue('order-processing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    })
  : null;

if (orderQueue) {
  logger.info('🚀 Order Queue Initialized (Redis-backed)');
} else {
  logger.warn('⚠️ Order Queue Disabled (Redis not configured) - Falling back to sync processing');
}
