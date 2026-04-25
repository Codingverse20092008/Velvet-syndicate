import { db } from './db';
import { auditLogs } from './schema';
import { randomUUID } from 'crypto';

export async function createAuditLog(action: string, entityId: string, metadata?: any) {
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      action,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Standard API Response Formatter
 */
export function successResponse(data: any) {
  return { success: true, data };
}

export function errorResponse(error: string, code: string = 'INTERNAL_ERROR', status: number = 500) {
  return { success: false, error, code };
}
