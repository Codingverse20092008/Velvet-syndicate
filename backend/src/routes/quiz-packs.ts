import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { asyncHandler } from '../lib/api-handler-express'
import { successResponse } from '../lib/api-response-express'
import { getUserFromRequest } from '../lib/auth-express'
import { dbClient } from '../lib/db'
import { validateQuizPack } from '../services/quiz-pack/validation.service'
import { importQuizPack, checkExistingPack, getPacks, getPackById, getQuestionsByPackId, deletePack, togglePackStatus, getImportLogs } from '../services/quiz-pack/import.service'
import { generateDailyPool, generateWeeklyPool, getDailyPoolQuestions, getWeeklyPoolQuestions, getTodayPoolStatus } from '../services/quiz-pack/pool.service'
import { getQuizAnalytics, getPerPackAnalytics, getPackDetailAnalytics, getQuestionDifficultyRanking } from '../services/quiz-pack/analytics.service'
import { recordQuizAttempt } from '../services/vault-persistence.service'
import { getUserVault, saveUserVault } from '../services/vault-persistence.service'
import { processMcqAnswer, processFillBlanksAnswer } from '../services/vault.service'

const router = Router()

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  return `'${String(val).replace(/'/g, "''")}'`
}

// ─── VALIDATE ──────────────────────────────────────────────────────────────────
router.post('/validate', asyncHandler(async (req: Request, res: Response) => {
  const result = validateQuizPack(req.body)
  const versionInfo = result.valid ? await checkExistingPack(result.packName) : null
  return successResponse(res, { ...result, versionInfo })
}))

// ─── PREVIEW ───────────────────────────────────────────────────────────────────
router.post('/preview', asyncHandler(async (req: Request, res: Response) => {
  const result = validateQuizPack(req.body)
  if (!result.valid) {
    return successResponse(res, { valid: false, errors: result.errors })
  }
  return successResponse(res, {
    valid: true,
    packName: result.packName,
    description: result.description,
    category: result.category,
    difficulty: result.difficulty,
    totalQuestions: result.questionCount,
    totalXp: result.totalXp,
    totalCoins: result.totalCoins,
    previewQuestions: result.previewQuestions,
  })
}))

// ─── IMPORT ────────────────────────────────────────────────────────────────────
router.post('/import', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req)
  const { action } = req.query as { action?: string }

  const validationResult = validateQuizPack(req.body)
  if (!validationResult.valid) {
    return successResponse(res, { success: false, errors: validationResult.errors })
  }

  const importAction = action === 'update' ? 'update_existing' : 'create_new'
  const questions = (req.body.questions || []).map((q: any) => ({
    type: q.type || 'mcq',
    question: q.question,
    correctAnswer: q.correctAnswer,
    options: q.options,
    xp: q.xp || 10,
    coins: q.coins || 0,
    explanation: q.explanation,
    difficulty: q.difficulty || 'medium',
    category: q.category,
  }))

  const result = await importQuizPack(validationResult, questions, importAction, user.id)
  return successResponse(res, result)
}))

// ─── LIST PACKS ────────────────────────────────────────────────────────────────
router.get('/packs', asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined
  const category = req.query.category as string | undefined
  const search = req.query.search as string | undefined
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Number(req.query.offset) || 0

  const result = await getPacks({ status, category, search }, limit, offset)
  return successResponse(res, result)
}))

// ─── GET PACK ──────────────────────────────────────────────────────────────────
router.get('/packs/:id', asyncHandler(async (req: Request, res: Response) => {
  const pack = await getPackById(req.params.id)
  if (!pack) return successResponse(res, { pack: null })
  const questions = await getQuestionsByPackId(req.params.id)
  return successResponse(res, { pack, questions })
}))

// ─── DELETE PACK ───────────────────────────────────────────────────────────────
router.delete('/packs/:id', asyncHandler(async (req: Request, res: Response) => {
  const deleted = await deletePack(req.params.id)
  return successResponse(res, { deleted })
}))

// ─── TOGGLE PACK STATUS ────────────────────────────────────────────────────────
router.patch('/packs/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.enum(['active', 'inactive', 'archived']) }).parse(req.body)
  const updated = await togglePackStatus(req.params.id, status)
  return successResponse(res, { updated })
}))

// ─── IMPORT LOGS ───────────────────────────────────────────────────────────────
router.get('/import-logs', asyncHandler(async (req: Request, res: Response) => {
  const packId = req.query.packId as string | undefined
  const logs = await getImportLogs(packId)
  return successResponse(res, { logs })
}))

// ─── DAILY POOL ────────────────────────────────────────────────────────────────
router.post('/pool/daily/generate', asyncHandler(async (req: Request, res: Response) => {
  const result = await generateDailyPool()
  return successResponse(res, result)
}))

router.get('/pool/daily', asyncHandler(async (req: Request, res: Response) => {
  const questions = await getDailyPoolQuestions()
  return successResponse(res, { questions, count: questions.length })
}))

// ─── WEEKLY POOL ───────────────────────────────────────────────────────────────
router.post('/pool/weekly/generate', asyncHandler(async (req: Request, res: Response) => {
  const result = await generateWeeklyPool()
  return successResponse(res, result)
}))

router.get('/pool/weekly', asyncHandler(async (req: Request, res: Response) => {
  const questions = await getWeeklyPoolQuestions()
  return successResponse(res, { questions, count: questions.length })
}))

// ─── POOL STATUS ───────────────────────────────────────────────────────────────
router.get('/pool/status', asyncHandler(async (req: Request, res: Response) => {
  const status = await getTodayPoolStatus()
  return successResponse(res, status)
}))

// ─── ANALYTICS ─────────────────────────────────────────────────────────────────
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  const analytics = await getQuizAnalytics()
  return successResponse(res, analytics)
}))

// ─── PER-PACK ANALYTICS ─────────────────────────────────────────────────────────
router.get('/analytics/packs', asyncHandler(async (req: Request, res: Response) => {
  const result = await getPerPackAnalytics()
  return successResponse(res, result)
}))

// ─── SINGLE PACK DETAILED ANALYTICS ─────────────────────────────────────────────
router.get('/analytics/packs/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await getPackDetailAnalytics(req.params.id)
  return successResponse(res, result)
}))

// ─── QUESTION DIFFICULTY RANKING ────────────────────────────────────────────────
router.get('/analytics/questions/difficulty', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const result = await getQuestionDifficultyRanking(limit)
  return successResponse(res, result)
}))

// ─── SUBMIT ANSWER ─────────────────────────────────────────────────────────────
const submitAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
})

router.post('/answer', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req)
  const { questionId, answer } = submitAnswerSchema.parse(req.body)

  const questionResult = await dbClient.execute(
    `SELECT * FROM quiz_questions WHERE id = ${esc(questionId)} LIMIT 1`
  )
  if (questionResult.rows.length === 0) {
    return successResponse(res, { success: false, error: 'Question not found' })
  }

  const question = questionResult.rows[0] as any
  let isCorrect = false

  if (question.type === 'mcq') {
    isCorrect = answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
  } else if (question.type === 'true_false') {
    isCorrect = answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
  } else if (question.type === 'fill_blank') {
    const accepted = JSON.parse(question.options_json || '[]')
    isCorrect = accepted.length > 0
      ? accepted.some((a: string) => a.trim().toLowerCase() === answer.trim().toLowerCase())
      : answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
  } else if (question.type === 'multi_select') {
    const userAnswers = answer.split(',').map(a => a.trim().toLowerCase()).sort()
    const correctAnswers = question.correct_answer.split(',').map((a: string) => a.trim().toLowerCase()).sort()
    isCorrect = JSON.stringify(userAnswers) === JSON.stringify(correctAnswers)
  }

  const attemptId = crypto.randomUUID()
  await dbClient.execute(`
    INSERT INTO quiz_attempts (id, user_id, question_id, is_correct)
    VALUES (${esc(attemptId)}, ${esc(user.id)}, ${esc(questionId)}, ${esc(isCorrect ? 1 : 0)})
  `)

  const state = await getUserVault(user.id)
  let xpAwarded = 0
  let coinsAwarded = 0

  if (isCorrect) {
    if (question.type === 'mcq') {
      const result = processMcqAnswer(state, true, true)
      xpAwarded = result.xpAwarded
      await saveUserVault(user.id, result.state)
    } else if (question.type === 'fill_blank') {
      const result = processFillBlanksAnswer(state, true, true)
      xpAwarded = result.xpAwarded
      await saveUserVault(user.id, result.state)
    } else {
      xpAwarded = question.xp || 10
      coinsAwarded = question.coins || 0
    }
  }

  return successResponse(res, {
    success: true,
    isCorrect,
    correctAnswer: question.correct_answer,
    explanation: question.explanation || null,
    type: question.type,
    xpAwarded,
    coinsAwarded,
  })
}))

export default router
