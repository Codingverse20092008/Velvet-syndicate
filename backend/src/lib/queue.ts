import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

// 🛡️ Redis connection for BullMQ (TCP/IORedis based)
const connection = new IORedis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

connection.on('error', (err) => {
  logger.error({ err }, 'Redis Queue Connection Error');
});

// 🎯 Order Processing Queue
export const orderQueue = new Queue('order-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

logger.info('🚀 Order Queue Initialized');
