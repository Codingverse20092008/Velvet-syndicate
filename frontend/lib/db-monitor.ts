import { db } from './db';
import { logger } from './logger';
import { env } from './env';
import { sql } from 'drizzle-orm';

interface QueryMetrics {
  query: string;
  duration: number;
  table?: string;
  operation?: string;
}

// Query timing wrapper
export async function timedQuery<T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  if (!env.ENABLE_QUERY_LOGGING) {
    return queryFn();
  }

  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    // Log slow queries (> 100ms)
    if (duration > 100) {
      logger.warn({
        type: 'slow_query',
        operation,
        durationMs: Math.round(duration),
      }, `Slow query detected: ${operation}`);
    } else {
      logger.debug({
        type: 'query',
        operation,
        durationMs: Math.round(duration),
      }, `Query completed: ${operation}`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error({
      type: 'query_error',
      operation,
      durationMs: Math.round(duration),
      error: (error as Error).message,
    }, `Query failed: ${operation}`);
    throw error;
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  connections?: number;
}> {
  const start = performance.now();
  try {
    // Simple health check query
    await db.run(sql`SELECT 1`);
    const latency = performance.now() - start;

    return {
      healthy: true,
      latency: Math.round(latency),
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Math.round(performance.now() - start),
    };
  }
}

// Get database stats
export async function getDatabaseStats(): Promise<{
  tables: Record<string, number>;
  indexes: string[];
}> {
  const tables: Record<string, number> = {};

  try {
    // Get table row counts
    const tableNames = ['users', 'products', 'orders', 'cart', 'sessions'];

    for (const table of tableNames) {
      try {
        const result = await db.run(sql`SELECT COUNT(*) as count FROM ${sql.raw(table)}`);
        tables[table] = Number(result.rows[0]?.count || 0);
      } catch {
        tables[table] = -1;
      }
    }

    return {
      tables,
      indexes: [], // Would need to query sqlite_master for indexes
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get database stats');
    return { tables: {}, indexes: [] };
  }
}

// Query builder with N+1 detection
export class QueryBuilder<T> {
  private queries: Array<{ table: string; duration: number }> = [];
  private parentOperation: string;

  constructor(parentOperation: string) {
    this.parentOperation = parentOperation;
  }

  async execute<U>(
    table: string,
    queryFn: () => Promise<U>
  ): Promise<U> {
    const start = performance.now();
    const result = await queryFn();
    const duration = performance.now() - start;

    this.queries.push({ table, duration });

    // Detect N+1 pattern: many queries to same table
    const tableQueries = this.queries.filter((q) => q.table === table);
    if (tableQueries.length > 5) {
      logger.warn({
        type: 'nplus1_detected',
        operation: this.parentOperation,
        table,
        queryCount: tableQueries.length,
        totalDurationMs: tableQueries.reduce((sum, q) => sum + q.duration, 0),
      }, `N+1 query pattern detected for ${table}`);
    }

    return result;
  }

  getMetrics(): { totalQueries: number; totalDuration: number; queries: Array<{ table: string; duration: number }> } {
    return {
      totalQueries: this.queries.length,
      totalDuration: this.queries.reduce((sum: number, q: { table: string; duration: number }) => sum + q.duration, 0),
      queries: this.queries,
    };
  }
}

// Optimized batch loading to prevent N+1
export async function batchLoad<T, K>(
  keys: K[],
  loader: (batch: K[]) => Promise<Map<K, T>>,
  options: { batchSize?: number; operation: string } = { operation: 'batch_load' }
): Promise<Map<K, T>> {
  const { batchSize = 100, operation } = options;
  const results = new Map<K, T>();

  const start = performance.now();

  // Process in batches
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const batchResults = await loader(batch);

    batchResults.forEach((value, key) => {
      results.set(key, value);
    });
  }

  const duration = performance.now() - start;
  logger.debug({
    type: 'batch_load',
    operation,
    keyCount: keys.length,
    batchCount: Math.ceil(keys.length / batchSize),
    durationMs: Math.round(duration),
  }, `Batch load completed: ${operation}`);

  return results;
}

// Connection pool monitoring (for Turso/libSQL)
export async function getConnectionStats(): Promise<{
  status: string;
  url: string;
}> {
  return {
    status: 'connected',
    url: env.TURSO_DATABASE_URL.replace(/token=[^&]+/, 'token=***'),
  };
}
