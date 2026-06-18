import { dbClient } from '../../lib/db'

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  return `'${String(val).replace(/'/g, "''")}'`
}

export interface QuizAnalytics {
  totalPacks: number
  activePacks: number
  totalQuestions: number
  totalAttempts: number
  correctRate: number
  incorrectRate: number
  mostAttemptedCategory: string
  mostFailedQuestion: { id: string; question: string; failCount: number } | null
  dailyActiveUsers: number
  questionsByType: { type: string; count: number }[]
  questionsByDifficulty: { difficulty: string; count: number }[]
  recentAttempts: { date: string; count: number }[]
}

export async function getQuizAnalytics(): Promise<QuizAnalytics> {
  const [
    packsResult,
    questionsResult,
    attemptsResult,
    correctResult,
    categoryResult,
    failedResult,
    dailyUsersResult,
    typeResult,
    difficultyResult,
    dailyAttemptsResult,
  ] = await Promise.all([
    dbClient.execute('SELECT COUNT(*) as total FROM quiz_packs'),
    dbClient.execute('SELECT COUNT(*) as total FROM quiz_questions'),
    dbClient.execute('SELECT COUNT(*) as total FROM quiz_attempts'),
    dbClient.execute(`SELECT COUNT(*) as total FROM quiz_attempts WHERE is_correct = 1`),
    dbClient.execute(`
      SELECT q.category, COUNT(qa.id) as cnt FROM quiz_attempts qa
      JOIN quiz_questions q ON q.id = qa.question_id
      GROUP BY q.category ORDER BY cnt DESC LIMIT 1
    `),
    dbClient.execute(`
      SELECT q.id, q.question, COUNT(qa.id) as fail_count FROM quiz_attempts qa
      JOIN quiz_questions q ON q.id = qa.question_id
      WHERE qa.is_correct = 0
      GROUP BY q.id ORDER BY fail_count DESC LIMIT 1
    `),
    dbClient.execute(`
      SELECT COUNT(DISTINCT user_id) as total FROM quiz_attempts
      WHERE answered_at >= datetime('now', '-1 day')
    `),
    dbClient.execute('SELECT type, COUNT(*) as count FROM quiz_questions GROUP BY type'),
    dbClient.execute('SELECT difficulty, COUNT(*) as count FROM quiz_questions GROUP BY difficulty'),
    dbClient.execute(`
      SELECT date(answered_at) as date, COUNT(*) as count FROM quiz_attempts
      WHERE answered_at >= datetime('now', '-7 days')
      GROUP BY date(answered_at) ORDER BY date ASC
    `),
  ])

  const totalPacks = (packsResult.rows[0] as any)?.total || 0
  const totalQuestions = (questionsResult.rows[0] as any)?.total || 0
  const totalAttempts = (attemptsResult.rows[0] as any)?.total || 0
  const correctCount = (correctResult.rows[0] as any)?.total || 0

  const correctRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0
  const incorrectRate = 100 - correctRate

  const activeResult = await dbClient.execute(
    `SELECT COUNT(*) as total FROM quiz_packs WHERE status = 'active'`
  )
  const activePacks = (activeResult.rows[0] as any)?.total || 0

  const mostAttemptedCategory = categoryResult.rows.length > 0
    ? (categoryResult.rows[0] as any).category : 'N/A'

  const mostFailedQuestion = failedResult.rows.length > 0
    ? {
        id: (failedResult.rows[0] as any).id,
        question: (failedResult.rows[0] as any).question,
        failCount: (failedResult.rows[0] as any).fail_count,
      }
    : null

  const dailyActiveUsers = (dailyUsersResult.rows[0] as any)?.total || 0

  const questionsByType = (typeResult.rows as any[]).map(r => ({
    type: r.type,
    count: r.count,
  }))

  const questionsByDifficulty = (difficultyResult.rows as any[]).map(r => ({
    difficulty: r.difficulty,
    count: r.count,
  }))

  const recentAttempts = (dailyAttemptsResult.rows as any[]).map(r => ({
    date: r.date,
    count: r.count,
  }))

  return {
    totalPacks,
    activePacks,
    totalQuestions,
    totalAttempts,
    correctRate,
    incorrectRate,
    mostAttemptedCategory,
    mostFailedQuestion,
    dailyActiveUsers,
    questionsByType,
    questionsByDifficulty,
    recentAttempts,
  }
}

// ─── PER-PACK ANALYTICS ─────────────────────────────────────────────────────────

export interface PerPackAnalytics {
  packs: PerPackSummary[]
}

export interface PerPackSummary {
  packId: string
  packName: string
  category: string
  difficulty: string
  version: number
  status: string
  totalQuestions: number
  totalAttempts: number
  correctAttempts: number
  correctRate: number
  questionsByType: { type: string; count: number }[]
  questionsByDifficulty: { difficulty: string; count: number }[]
}

export async function getPerPackAnalytics(): Promise<PerPackAnalytics> {
  const packResult = await dbClient.execute(`
    SELECT qp.id, qp.pack_name, qp.category, qp.difficulty, qp.version,
      qp.status, qp.question_count
    FROM quiz_packs qp
    ORDER BY qp.imported_at DESC
  `)

  const packs: PerPackSummary[] = []

  for (const row of packResult.rows) {
    const p = row as any

    const attemptResult = await dbClient.execute(`
      SELECT COUNT(*) as total, SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM quiz_attempts qa
      JOIN quiz_questions qq ON qq.id = qa.question_id
      WHERE qq.pack_id = ${esc(p.id)}
    `)
    const attemptRow = attemptResult.rows[0] as any
    const totalAttempts = attemptRow?.total || 0
    const correctAttempts = attemptRow?.correct || 0
    const correctRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

    const typeResult = await dbClient.execute(`
      SELECT type, COUNT(*) as count FROM quiz_questions
      WHERE pack_id = ${esc(p.id)}
      GROUP BY type
    `)
    const questionsByType = (typeResult.rows as any[]).map(r => ({ type: r.type, count: r.count }))

    const diffResult = await dbClient.execute(`
      SELECT difficulty, COUNT(*) as count FROM quiz_questions
      WHERE pack_id = ${esc(p.id)}
      GROUP BY difficulty
    `)
    const questionsByDifficulty = (diffResult.rows as any[]).map(r => ({ difficulty: r.difficulty, count: r.count }))

    packs.push({
      packId: p.id,
      packName: p.pack_name,
      category: p.category,
      difficulty: p.difficulty,
      version: p.version,
      status: p.status,
      totalQuestions: p.question_count,
      totalAttempts,
      correctAttempts,
      correctRate,
      questionsByType,
      questionsByDifficulty,
    })
  }

  return { packs }
}

// ─── SINGLE PACK DETAILED ANALYTICS ─────────────────────────────────────────────

export interface PackDetailAnalytics {
  pack: PerPackSummary
  questions: PerQuestionStats[]
}

export interface PerQuestionStats {
  questionId: string
  question: string
  type: string
  difficulty: string
  totalAttempts: number
  correctCount: number
  incorrectCount: number
  correctRate: number
  difficultyScore: number
}

export async function getPackDetailAnalytics(packId: string): Promise<PackDetailAnalytics | null> {
  const packResult = await dbClient.execute(
    `SELECT id, pack_name, category, difficulty, version, status, question_count
     FROM quiz_packs WHERE id = ${esc(packId)} LIMIT 1`
  )
  if (packResult.rows.length === 0) return null
  const p = packResult.rows[0] as any

  const attemptResult = await dbClient.execute(`
    SELECT COUNT(*) as total, SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM quiz_attempts qa
    JOIN quiz_questions qq ON qq.id = qa.question_id
    WHERE qq.pack_id = ${esc(packId)}
  `)
  const attemptRow = attemptResult.rows[0] as any
  const totalAttempts = attemptRow?.total || 0
  const correctAttempts = attemptRow?.correct || 0
  const correctRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

  const typeResult = await dbClient.execute(
    `SELECT type, COUNT(*) as count FROM quiz_questions WHERE pack_id = ${esc(packId)} GROUP BY type`
  )
  const questionsByType = (typeResult.rows as any[]).map(r => ({ type: r.type, count: r.count }))

  const diffResult = await dbClient.execute(
    `SELECT difficulty, COUNT(*) as count FROM quiz_questions WHERE pack_id = ${esc(packId)} GROUP BY difficulty`
  )
  const questionsByDifficulty = (diffResult.rows as any[]).map(r => ({ difficulty: r.difficulty, count: r.count }))

  const pack: PerPackSummary = {
    packId: p.id,
    packName: p.pack_name,
    category: p.category,
    difficulty: p.difficulty,
    version: p.version,
    status: p.status,
    totalQuestions: p.question_count,
    totalAttempts,
    correctAttempts,
    correctRate,
    questionsByType,
    questionsByDifficulty,
  }

  const questionResult = await dbClient.execute(`
    SELECT qq.id, qq.question, qq.type, qq.difficulty
    FROM quiz_questions qq
    WHERE qq.pack_id = ${esc(packId)}
    ORDER BY qq.created_at ASC
  `)

  const questions: PerQuestionStats[] = []
  for (const qRow of questionResult.rows) {
    const q = qRow as any
    const statsResult = await dbClient.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_cnt,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect_cnt
      FROM quiz_attempts
      WHERE question_id = ${esc(q.id)}
    `)
    const stats = statsResult.rows[0] as any
    const qTotal = stats?.total || 0
    const qCorrect = stats?.correct_cnt || 0
    const qIncorrect = stats?.incorrect_cnt || 0
    const qCorrectRate = qTotal > 0 ? Math.round((qCorrect / qTotal) * 100) : 0
    const difficultyScore = qTotal > 0 ? Math.round((1 - qCorrect / qTotal) * 100) : 0

    questions.push({
      questionId: q.id,
      question: q.question,
      type: q.type,
      difficulty: q.difficulty,
      totalAttempts: qTotal,
      correctCount: qCorrect,
      incorrectCount: qIncorrect,
      correctRate: qCorrectRate,
      difficultyScore,
    })
  }

  return { pack, questions }
}

// ─── QUESTION DIFFICULTY RANKING ────────────────────────────────────────────────

export interface DifficultyRanking {
  questions: DifficultyRankItem[]
}

export interface DifficultyRankItem {
  questionId: string
  question: string
  type: string
  difficulty: string
  packName: string
  totalAttempts: number
  correctRate: number
  difficultyScore: number
}

export async function getQuestionDifficultyRanking(limit: number = 20): Promise<DifficultyRanking> {
  const result = await dbClient.execute(`
    SELECT
      qq.id,
      qq.question,
      qq.type,
      qq.difficulty,
      qp.pack_name,
      COUNT(qa.id) as total_attempts,
      CAST(SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(qa.id), 0) * 100 as correct_rate
    FROM quiz_questions qq
    JOIN quiz_packs qp ON qp.id = qq.pack_id
    LEFT JOIN quiz_attempts qa ON qa.question_id = qq.id
    GROUP BY qq.id
    HAVING total_attempts > 0
    ORDER BY correct_rate ASC
    LIMIT ${esc(limit)}
  `)

  const questions: DifficultyRankItem[] = (result.rows as any[]).map(r => ({
    questionId: r.id,
    question: r.question,
    type: r.type,
    difficulty: r.difficulty,
    packName: r.pack_name,
    totalAttempts: r.total_attempts,
    correctRate: r.correct_rate !== null ? Math.round(r.correct_rate) : 0,
    difficultyScore: r.correct_rate !== null ? Math.round(100 - r.correct_rate) : 0,
  }))

  return { questions }
}
