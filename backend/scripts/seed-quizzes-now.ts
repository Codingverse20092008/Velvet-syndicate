/**
 * seed-quizzes-now.ts
 * One-shot script to generate today's 500 quizzes immediately.
 * Run with: npm run --prefix backend seed:quizzes
 */
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '../../.env.local') });

import { quizScheduler } from '../src/scripts/quiz-scheduler';

async function run() {
  console.log('🎮 Seeding today\'s quiz pool (500 quizzes)...');
  console.log('This will take about 1–2 minutes. Please wait.\n');

  try {
    await quizScheduler.triggerNow();
    console.log('\n✅ Quiz seeding complete! Start the backend server to serve them.');
  } catch (err) {
    console.error('❌ Quiz seeding failed:', err);
    process.exit(1);
  }
}

run();
