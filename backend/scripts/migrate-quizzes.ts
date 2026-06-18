import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  console.log('Creating quizzes table...');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      options TEXT NOT NULL,
      answer_index INTEGER NOT NULL,
      points INTEGER NOT NULL DEFAULT 20,
      generated_date TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
    )
  `);

  await client.execute(
    `CREATE INDEX IF NOT EXISTS quizzes_date_idx ON quizzes (generated_date)`
  );

  console.log('✅ quizzes table created successfully!');

  // Verify
  const result = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='quizzes'`);
  console.log('Table check:', result.rows);
}

migrate().catch(console.error);
