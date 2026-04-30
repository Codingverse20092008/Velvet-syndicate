import { db } from '../lib/db';
import { orderIntents } from '../lib/schema';
import { orderQueue } from '../lib/queue';
import { eq, and, lt, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { sendAlert } from '../lib/alerts';

/**
 * 🩹 WAL RECONCILIATION SERVICE
 * Scans for orphaned order intents (QUEUED but never processed)
 * and automatically re-enqueues them to ensure zero data loss.
 */
export async function runReconciliation() {
  const log = logger.child({ service: 'reconciliation' });
  
  try {
    // 1. Find intents stuck in QUEUED for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const orphanedIntents = await db.query.orderIntents.findMany({
      where: and(
        eq(orderIntents.status, 'QUEUED'),
        lt(orderIntents.createdAt, fiveMinutesAgo)
      ),
      limit: 50 // Process in batches
    });

    if (orphanedIntents.length === 0) return;

    log.info({ count: orphanedIntents.length }, 'Found orphaned order intents, starting replay');

    for (const intent of orphanedIntents) {
      const data = JSON.parse(intent.data);
      
      try {
        if (!orderQueue) {
          log.warn({ intentId: intent.id }, 'Cannot re-queue: Order Queue is disabled');
          continue;
        }
        // Re-enqueue using the original idempotencyKey as jobId
        await orderQueue.add(`replayed-order-${intent.id}`, {
          ...data,
          idempotencyKey: intent.id,
          isReplayed: true
        }, {
          jobId: intent.id,
          priority: 5 // Replayed orders get higher priority (bumped from 10)
        });

        log.info({ intentId: intent.id }, 'Successfully re-queued orphaned intent');
      } catch (err) {
        log.error({ intentId: intent.id, err }, 'Failed to re-queue intent during reconciliation');
      }
    }

    // 2. Alert if there's a large backlog
    if (orphanedIntents.length > 20) {
      await sendAlert('High volume of orphaned order intents detected!', { 
        count: orphanedIntents.length,
        action: 'Automatic reconciliation triggered'
      });
    }

  } catch (err) {
    log.error({ err }, 'WAL Reconciliation cycle failed');
  }
}
