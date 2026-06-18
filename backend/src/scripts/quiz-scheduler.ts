import crypto from 'node:crypto';
import { db } from '../lib/db';
import { quizzes } from '../lib/schema';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-4-26b-a4b-it:free';
const QUIZZES_PER_BATCH = 20;
const TOTAL_QUIZZES = 500;
const TOTAL_BATCHES = Math.ceil(TOTAL_QUIZZES / QUIZZES_PER_BATCH); // 25 batches

interface QuizQuestion {
  title: string;
  prompt: string;
  options: string[];
  answerIndex: number;
}

async function fetchQuizBatch(batchNum: number): Promise<QuizQuestion[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `Generate ${QUIZZES_PER_BATCH} unique streetwear, sneaker, and fashion culture multiple-choice trivia questions. 
          Vary the difficulty and topics. Topics can include: sneaker history, designer collaborations, streetwear brands, fashion terminology, iconic drops, shoe materials, cultural moments.
          Return ONLY a valid JSON array. No markdown, no explanation, just the JSON array.
          Each element must strictly follow this structure:
          {"title": "Short Quiz Title", "prompt": "The full question text?", "options": ["Choice A", "Choice B", "Choice C"], "answerIndex": 0}
          - options must always have exactly 3 items
          - answerIndex must be 0, 1, or 2 (index of the correct option)
          - Make questions creative, educational, and engaging for sneakerheads`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (batch ${batchNum}): ${response.status} - ${error}`);
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No content returned from OpenRouter (batch ${batchNum})`);

  // Strip potential markdown code blocks
  const cleaned = content.replace(/```json|```/g, '').trim();
  const parsed: QuizQuestion[] = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error(`Response is not an array (batch ${batchNum})`);
  }

  return parsed;
}

export class QuizScheduler {
  private isRunning = false;
  private scheduledTimeout: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) {
      logger.warn('Quiz scheduler is already running');
      return;
    }
    this.isRunning = true;
    this.scheduleNextRun();
    logger.info('✅ Daily quiz scheduler started — will generate 500 quizzes at 5:00 AM daily');
  }

  stop() {
    this.isRunning = false;
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    logger.info('Quiz scheduler stopped');
  }

  private scheduleNextRun() {
    const now = new Date();
    const next5AM = new Date();

    // Set to 5:00 AM today (local server time)
    next5AM.setHours(5, 0, 0, 0);

    // If it's already past 5 AM today, schedule for tomorrow
    if (now >= next5AM) {
      next5AM.setDate(next5AM.getDate() + 1);
    }

    const msUntilNextRun = next5AM.getTime() - now.getTime();
    const hoursUntil = Math.round(msUntilNextRun / 1000 / 60 / 60 * 10) / 10;

    logger.info({ nextRun: next5AM.toISOString(), hoursUntil }, '⏰ Next quiz generation scheduled');

    this.scheduledTimeout = setTimeout(async () => {
      await this.performDailyGeneration();
      // Schedule the next run after this one completes
      if (this.isRunning) {
        this.scheduleNextRun();
      }
    }, msUntilNextRun);
  }

  async performDailyGeneration() {
    const today = new Date().toISOString().split('T')[0]; // e.g. "2026-06-11"
    logger.info({ date: today }, '🎮 Starting daily quiz generation (500 quizzes)...');

    try {
      // 1. Clear today's existing quizzes to avoid duplicates
      await db.delete(quizzes).where(sql`generated_date = ${today}`);
      logger.info({ date: today }, 'Cleared existing quizzes for today');

      let totalInserted = 0;
      let totalFailed = 0;

      // Free tier limit: 20 requests/min
      // We send 1 batch every 3.5 seconds = ~17 requests/min (safely under the cap)
      const DELAY_BETWEEN_BATCHES_MS = 3500;

      // 2. Generate in 25 batches of 20 each
      for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
        let retried = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            logger.info({ batch, total: TOTAL_BATCHES, attempt }, `Generating quiz batch ${batch}/${TOTAL_BATCHES}...`);

            const questions = await fetchQuizBatch(batch);

            // Validate and insert each question
            const validQuestions = questions.filter(
              (q) =>
                q.title &&
                q.prompt &&
                Array.isArray(q.options) &&
                q.options.length === 3 &&
                typeof q.answerIndex === 'number' &&
                q.answerIndex >= 0 &&
                q.answerIndex <= 2
            );

            for (const q of validQuestions) {
              await db.insert(quizzes).values({
                id: crypto.randomUUID(),
                title: q.title,
                prompt: q.prompt,
                options: JSON.stringify(q.options),
                answerIndex: q.answerIndex,
                points: 20,
                generatedDate: today,
              });
              totalInserted++;
            }

            logger.info({ batch, inserted: validQuestions.length }, `Batch ${batch} done`);
            break; // success — exit attempt loop

          } catch (batchErr: any) {
            const is429 = batchErr?.message?.includes('429');

            if (is429 && !retried) {
              // Hit rate limit — wait 65 seconds and retry once
              retried = true;
              logger.warn({ batch }, `Rate limit hit on batch ${batch} — waiting 65s before retry...`);
              await new Promise((resolve) => setTimeout(resolve, 65000));
              continue; // retry the same batch
            }

            // Give up on this batch after 2 attempts
            totalFailed++;
            logger.error({ batch, err: batchErr }, `Batch ${batch} failed after ${attempt} attempt(s) — skipping`);
            break;
          }
        }

        // Rate-limit-safe delay between batches (3.5s = ~17 req/min, under the 20/min cap)
        if (batch < TOTAL_BATCHES) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
      }

      logger.info(
        { totalInserted, totalFailed, date: today },
        `✅ Daily quiz generation complete: ${totalInserted} quizzes saved, ${totalFailed} batches failed`
      );
    } catch (err) {
      logger.error({ err }, '❌ Daily quiz generation failed');
      throw err;
    }
  }

  // Manual trigger for testing
  async triggerNow() {
    logger.info('Manual quiz generation triggered');
    return this.performDailyGeneration();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRunAt: this.scheduledTimeout ? (() => {
        const next5AM = new Date();
        next5AM.setHours(5, 0, 0, 0);
        if (new Date() >= next5AM) next5AM.setDate(next5AM.getDate() + 1);
        return next5AM.toISOString();
      })() : null,
    };
  }
}

export const quizScheduler = new QuizScheduler();
