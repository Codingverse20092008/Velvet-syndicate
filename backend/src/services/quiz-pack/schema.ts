import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const quizPacks = sqliteTable('quiz_packs', {
  id: text('id').primaryKey(),
  packName: text('pack_name').notNull(),
  description: text('description').default(''),
  category: text('category').notNull().default('general'),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard', 'mixed'] }).notNull().default('mixed'),
  version: integer('version').notNull().default(1),
  questionCount: integer('question_count').notNull().default(0),
  totalXp: integer('total_xp').notNull().default(0),
  totalCoins: integer('total_coins').notNull().default(0),
  status: text('status', { enum: ['active', 'inactive', 'archived'] }).notNull().default('active'),
  importedBy: text('imported_by'),
  importedAt: text('imported_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  categoryIdx: index('quiz_packs_category_idx').on(table.category),
  statusIdx: index('quiz_packs_status_idx').on(table.status),
  importedAtIdx: index('quiz_packs_imported_at_idx').on(table.importedAt),
  packNameUniqueIdx: uniqueIndex('quiz_packs_pack_name_idx').on(table.packName, table.version),
}));

export const quizQuestions = sqliteTable('quiz_questions', {
  id: text('id').primaryKey(),
  packId: text('pack_id').notNull().references(() => quizPacks.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['mcq', 'fill_blank', 'true_false', 'multi_select'] }).notNull(),
  question: text('question').notNull(),
  optionsJson: text('options_json'),
  correctAnswer: text('correct_answer').notNull(),
  xp: integer('xp').notNull().default(10),
  coins: integer('coins').notNull().default(0),
  explanation: text('explanation'),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull().default('medium'),
  category: text('category').notNull().default('general'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  packIdIdx: index('quiz_questions_pack_id_idx').on(table.packId),
  typeIdx: index('quiz_questions_type_idx').on(table.type),
  difficultyIdx: index('quiz_questions_difficulty_idx').on(table.difficulty),
  categoryIdx: index('quiz_questions_category_idx').on(table.category),
}));

export const quizAttempts = sqliteTable('quiz_attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  answeredAt: text('answered_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('quiz_attempts_user_id_idx').on(table.userId),
  questionIdIdx: index('quiz_attempts_question_id_idx').on(table.questionId),
  userQuestionIdx: index('quiz_attempts_user_question_idx').on(table.userId, table.questionId),
}));

export const quizPoolHistory = sqliteTable('quiz_pool_history', {
  id: text('id').primaryKey(),
  poolType: text('pool_type', { enum: ['daily', 'weekly'] }).notNull(),
  generatedAt: text('generated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  questionIdsJson: text('question_ids_json').notNull(),
  date: text('date').notNull(),
}, (table) => ({
  poolTypeDateIdx: uniqueIndex('quiz_pool_history_type_date_idx').on(table.poolType, table.date),
  poolTypeIdx: index('quiz_pool_history_type_idx').on(table.poolType),
  dateIdx: index('quiz_pool_history_date_idx').on(table.date),
}));

export const quizPackImportLogs = sqliteTable('quiz_pack_import_logs', {
  id: text('id').primaryKey(),
  packId: text('pack_id').notNull().references(() => quizPacks.id, { onDelete: 'cascade' }),
  questionsImported: integer('questions_imported').notNull().default(0),
  questionsFailed: integer('questions_failed').notNull().default(0),
  importedBy: text('imported_by'),
  importedAt: text('imported_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  metadata: text('metadata'),
});
