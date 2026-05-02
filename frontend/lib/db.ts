import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './db-schema';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.warn('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in environment variables.');
}

export const dbClient = createClient({
  url: url || '',
  authToken: authToken || '',
});

export const db = drizzle(dbClient, { schema });
export type DB = typeof db;
