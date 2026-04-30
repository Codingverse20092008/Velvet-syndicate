import { db } from '../lib/db';
import { orderIntents } from '../lib/schema';
import { orderQueue } from '../lib/queue';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { sendAlert } from '../lib/alerts';
import { resetStaleProcessingIntents } from './order.service';

/**
 * 🩹 WAL RECONCILIATION SERVICE
 * Scans for orphaned order intents (QUEUED but never processed)
 * and automatically re-enqueues them to ensure zero data loss.
 */
export async function runReconciliation() {
  const log = logger.child({ service: 'reconciliation' });
  
  try {
    // 1) Recover stale PROCESSING intents (worker crash / stalled job)
    const recoveredIds = await resetStaleProcessingIntents(2 * 60 * 1000);
    if (recoveredIds.length > 0) {
      log.warn({ recoveredCount: recoveredIds.length }, 'Recovered stale processing intents');
    }

    // 2) Find intents that should be queued but are still waiting
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const orphanedIntents = await db.query.orderIntents.findMany({
      where: and(
        inArray(orderIntents.status, ['READY_FOR_QUEUE', 'QUEUED', 'FAILED_RETRYABLE', 'FAILED']),
        lt(orderIntents.createdAt, fiveMinutesAgo)
      ),
      limit: 50 // Process in batches
    });

    if (orphanedIntents.length === 0) return;

    log.info({ count: orphanedIntents.length }, 'Found orphaned order intents, starting replay');

    for (const intent of orphanedIntents) {
      try {
        if (!orderQueue) {
          log.warn({ intentId: intent.id }, 'Cannot re-queue: Order Queue is disabled');
          continue;
        }

        await orderQueue.add('process-order', {
          intentId: intent.id,
          requestId: 'reconciler',
        }, {
          jobId: intent.id,
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
          priority: 5
        });

        await db.update(orderIntents)
          .set({ status: 'ENQUEUED', updatedAt: new Date().toISOString() })
          .where(eq(orderIntents.id, intent.id));

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
