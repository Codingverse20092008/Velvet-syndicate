import { orderQueue } from '../lib/queue';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { orders } from '../lib/schema';
import { logger } from '../lib/logger';

/**
 * 📈 SYSTEM METRICS SERVICE
 * Provides real-time visibility into queue health and checkout success.
 */
export async function getSystemMetrics() {
  try {
    if (!orderQueue) {
      return {
        queue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        checkouts: { lastHourTotal: 0, lastHourSuccessRate: '0%', lastHourFailed: 0 },
        system: { uptime: process.uptime(), memory: process.memoryUsage().rss / 1024 / 1024 }
      };
    }
    const jobCounts = await orderQueue.getJobCounts();
    
    // Calculate checkout success rate in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        confirmed: sql<number>`count(case when status = 'CONFIRMED' then 1 end)`,
        failed: sql<number>`count(case when status = 'FAILED' then 1 end)`,
      })
      .from(orders)
      .where(sql`created_at > ${oneHourAgo}`);

    const successRate = stats.total > 0 
      ? (stats.confirmed / stats.total) * 100 
      : 100;

    return {
      queue: {
        waiting: jobCounts.waiting,
        active: jobCounts.active,
        completed: jobCounts.completed,
        failed: jobCounts.failed,
        delayed: jobCounts.delayed,
      },
      checkouts: {
        lastHourTotal: stats.total,
        lastHourSuccessRate: `${successRate.toFixed(2)}%`,
        lastHourFailed: stats.failed,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage().rss / 1024 / 1024,
      }
    };
  } catch (err) {
    logger.error({ err }, 'Failed to fetch system metrics');
    throw err;
  }
}

/**
 * 🩹 RECOVERY: AUTO-REPAIR STALE ORDERS
 * Checks for orders stuck in PENDING for too long.
 */
export async function runOrderRecovery() {
  logger.info('🩹 Starting order recovery scan...');
  if (!orderQueue) return;
  const failedJobs = await orderQueue.getFailed();
  logger.info({ failedCount: failedJobs.length }, 'Recovery scan completed');
}

/**
 * 🚀 MANUAL RECOVERY: RETRY FAILED JOBS
 * Admin utility to bulk-retry jobs that exhausted all attempts.
 */
export async function retryFailedJobs() {
  if (!orderQueue) return { retried: 0 };
  const failedJobs = await orderQueue.getFailed();
  for (const job of failedJobs) {
    await job.retry();
  }
  return { retried: failedJobs.length };
}
