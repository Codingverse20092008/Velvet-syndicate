import { db } from '../db';
import { auditLogs } from '../schema';
import { logger } from '../logger';

export type AuditAction =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGE'
  | 'ORDER_PAYMENT_CHANGE'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'PRICE_UPDATE'
  | 'STOCK_UPDATE'
  | 'STOCK_LOW'
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'ADMIN_ACTION';

export interface AuditMetadata {
  userId?: string;
  adminId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * Log an audit entry to the database
 * Non-blocking: failures are logged but don't interrupt the main operation
 */
export async function logAudit(
  action: AuditAction,
  entityId: string,
  metadata: AuditMetadata = {}
): Promise<void> {
  try {
    const auditId = crypto.randomUUID();

    // Serialize metadata to JSON string for SQLite storage
    const metadataJson = JSON.stringify({
      ...metadata,
      timestamp: new Date().toISOString(),
    });

    await db.insert(auditLogs).values({
      id: auditId,
      action,
      entityId,
      metadata: metadataJson,
    });

    logger.info(
      { auditId, action, entityId, metadata },
      'Audit log created'
    );
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    logger.error({ error, action, entityId }, 'Failed to create audit log');
  }
}

/**
 * Create audit log for stock changes
 */
export async function logStockChange(
  productId: string,
  size: string,
  oldStock: number,
  newStock: number,
  reason: string,
  userId?: string
): Promise<void> {
  return logAudit('STOCK_UPDATE', productId, {
    size,
    oldStock,
    newStock,
    change: newStock - oldStock,
    reason,
    userId,
  });
}

/**
 * Create audit log for price changes
 */
export async function logPriceChange(
  productId: string,
  oldPrice: number,
  newPrice: number,
  userId?: string
): Promise<void> {
  return logAudit('PRICE_UPDATE', productId, {
    oldPrice,
    newPrice,
    change: newPrice - oldPrice,
    userId,
  });
}

/**
 * Create audit log for order status changes
 */
export async function logOrderStatusChange(
  orderId: string,
  oldStatus: string,
  newStatus: string,
  userId?: string
): Promise<void> {
  return logAudit('ORDER_STATUS_CHANGE', orderId, {
    oldStatus,
    newStatus,
    userId,
  });
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogsForEntity(
  entityId: string,
  limit: number = 50
): Promise<typeof auditLogs.$inferSelect[]> {
  return await db.query.auditLogs.findMany({
    where: (logs, { eq }) => eq(logs.entityId, entityId),
    orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    limit,
  });
}
