import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from './env';
import { logger } from './logger';
import * as schema from './schema';

// Force redeploy - Production Data Cleaned

let circuitOpen = false;
let failureCount = 0;
const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 10000;

export const dbClient = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

// 🛡️ CIRCUIT BREAKER PROXY
const clientProxy = new Proxy(dbClient, {
  get(target, prop, receiver) {
    if (prop === 'execute' || prop === 'transaction') {
      return async (...args: any[]) => {
        if (circuitOpen) {
          logger.warn('🛡️ DB Circuit OPEN - Blocking request');
          throw new Error('Database is currently unavailable. Please try again later.');
        }

        try {
          const result = await (target as any)[prop](...args);
          failureCount = 0; // Reset on success
          return result;
        } catch (err) {
          failureCount++;
          logger.error({ err, failureCount }, 'DB Error detected');
          if (failureCount >= FAILURE_THRESHOLD) {
            circuitOpen = true;
            logger.error('💥 DB Circuit OPENED - Failure threshold reached');
            setTimeout(() => {
              circuitOpen = false;
              failureCount = 0;
              logger.info('🩹 DB Circuit CLOSED - Retrying...');
            }, RESET_TIMEOUT_MS);
          }
          throw err;
        }
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});

export const db = drizzle(clientProxy as any, { schema });
export type DB = typeof db;