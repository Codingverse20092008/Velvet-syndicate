import { db } from '../lib/db';
import { events } from '../lib/schema';
import { logger } from '../lib/logger';

const VALID_EVENT_TYPES = [
  'VIEW_PRODUCT',
  'ADD_TO_CART',
  'REMOVE_FROM_CART',
  'CHECKOUT_STARTED',
  'CHECKOUT_ABANDONED',
  'ORDER_CREATED',
  'ORDER_FAILED',
  'TRACK_ORDER_CLICKED',
  'RETURN_VISIT',
  'RECOMMENDATION_CLICKED',
  'PROFILE_UPDATED',
  'ADDRESS_ADDED',
] as const;

export type EventType = typeof VALID_EVENT_TYPES[number];

export async function trackEvent(
  eventType: string,
  metadata?: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    // Sanitize metadata - remove sensitive fields
    const sanitizedMetadata = metadata ? JSON.stringify(sanitizeMetadata(metadata)) : null;

    await db.insert(events).values({
      id: crypto.randomUUID(),
      userId: userId || null,
      eventType,
      metadata: sanitizedMetadata,
    });
  } catch (error) {
    // Never block UI - log and move on
    logger.warn({ error, eventType }, 'Failed to track event (non-blocking)');
  }
}

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'secret', 'email', 'phone', 'address', 'creditCard', 'cvv'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      continue;
    }
    // Only store primitives and arrays of primitives
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.filter(v => typeof v === 'string' || typeof v === 'number');
    }
  }

  return sanitized;
}

export async function getEventsByUserId(userId: string, limit = 50) {
  return await db.query.events.findMany({
    where: (events, { eq }) => eq(events.userId, userId),
    orderBy: (events, { desc }) => [desc(events.createdAt)],
    limit,
  });
}

export async function getEventsByType(eventType: string, limit = 100) {
  return await db.query.events.findMany({
    where: (events, { eq }) => eq(events.eventType, eventType),
    orderBy: (events, { desc }) => [desc(events.createdAt)],
    limit,
  });
}
