import crypto from 'crypto'
import { dbClient } from '../../lib/db'
import { getTodayDate } from '../vault.service'

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  return `'${String(val).replace(/'/g, "''")}'`
}

export function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

export async function getRecentlyUsedQuestionIds(daysBack: number = 7): Promise<Set<string>> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  const result = await dbClient.execute(`
    SELECT question_ids_json FROM quiz_pool_history
    WHERE date >= ${esc(cutoffDate)}
    ORDER BY generated_at DESC
  `)

  const ids = new Set<string>()
  for (const row of result.rows) {
    try {
      const parsed = JSON.parse((row as any).question_ids_json)
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => ids.add(id))
      }
    } catch { /* skip corrupt rows */ }
  }
  return ids
}

export function getDailyPoolConfig(): { easy: number; medium: number; hard: number } {
  return { easy: 3, medium: 2, hard: 1 }
}

export function getWeeklyPoolConfig(): { min: number; max: number } {
  return { min: 20, max: 30 }
}

export async function generateDailyPool(): Promise<{ success: boolean; questionIds: string[]; error?: string }> {
  const today = getTodayDate()

  const existing = await dbClient.execute(
    `SELECT id FROM quiz_pool_history WHERE pool_type = 'daily' AND date = ${esc(today)} LIMIT 1`
  )
  if (existing.rows.length > 0) {
    return { success: false, questionIds: [], error: 'Daily pool already generated for today' }
  }

  const recentlyUsed = await getRecentlyUsedQuestionIds(7)
  const config = getDailyPoolConfig()
  const questionIds: string[] = []

  const difficultyMap: Record<string, number> = {
    easy: config.easy,
    medium: config.medium,
    hard: config.hard,
  }

  const allCategories = await dbClient.execute(
    `SELECT DISTINCT qq.category FROM quiz_questions qq
     JOIN quiz_packs qp ON qp.id = qq.pack_id
     WHERE qq.category IS NOT NULL AND qp.status = 'active'`
  )
  const categories = allCategories.rows.map(r => (r as any).category).filter(Boolean)

  for (const [difficulty, count] of Object.entries(difficultyMap)) {
    let catFilter = ''
    if (categories.length > 0) {
      const pickedCat = categories[Math.floor(Math.random() * categories.length)]
      catFilter = `AND category = ${esc(pickedCat)}`
    }

    const result = await dbClient.execute(`
      SELECT qq.id FROM quiz_questions qq
      JOIN quiz_packs qp ON qp.id = qq.pack_id
      WHERE qq.difficulty = ${esc(difficulty)} ${catFilter}
      AND qp.status = 'active'
      ORDER BY RANDOM()
      LIMIT ${esc(count * 2)}
    `)

    const candidates = result.rows.map(r => (r as any).id).filter((id: string) => !recentlyUsed.has(id))
    const picked = candidates.slice(0, count)
    questionIds.push(...picked)
  }

  if (questionIds.length < 3) {
    const fallback = await dbClient.execute(`
      SELECT qq.id FROM quiz_questions qq
      JOIN quiz_packs qp ON qp.id = qq.pack_id
      WHERE qq.id NOT IN (${questionIds.map(id => esc(id)).join(',') || esc('')})
      AND qp.status = 'active'
      ORDER BY RANDOM()
      LIMIT ${esc(6 - questionIds.length)}
    `)
    questionIds.push(...fallback.rows.map(r => (r as any).id))
  }

  const poolId = crypto.randomUUID()
  const questionIdsJson = JSON.stringify(questionIds)
  await dbClient.execute(`
    INSERT INTO quiz_pool_history (id, pool_type, generated_at, question_ids_json, date)
    VALUES (${esc(poolId)}, 'daily', ${esc(new Date().toISOString())}, ${esc(questionIdsJson)}, ${esc(today)})
  `)

  return { success: true, questionIds }
}

export async function generateWeeklyPool(): Promise<{ success: boolean; questionIds: string[]; error?: string }> {
  const today = getTodayDate()
  const weekStart = getWeekStart()

  const existing = await dbClient.execute(
    `SELECT id FROM quiz_pool_history WHERE pool_type = 'weekly' AND date = ${esc(weekStart)} LIMIT 1`
  )
  if (existing.rows.length > 0) {
    return { success: false, questionIds: [], error: 'Weekly pool already generated for this week' }
  }

  const recentlyUsed = await getRecentlyUsedQuestionIds(14)
  const config = getWeeklyPoolConfig()
  const targetCount = config.min + Math.floor(Math.random() * (config.max - config.min + 1))

  const result = await dbClient.execute(`
    SELECT qq.id FROM quiz_questions qq
    JOIN quiz_packs qp ON qp.id = qq.pack_id
    WHERE qp.status = 'active'
    ORDER BY RANDOM()
    LIMIT ${esc(targetCount * 2)}
  `)

  const candidates = result.rows.map(r => (r as any).id).filter((id: string) => !recentlyUsed.has(id))
  const questionIds = candidates.slice(0, targetCount)

  if (questionIds.length < config.min) {
    const fallback = await dbClient.execute(`
      SELECT qq.id FROM quiz_questions qq
      JOIN quiz_packs qp ON qp.id = qq.pack_id
      WHERE qq.id NOT IN (${questionIds.length > 0 ? questionIds.map(id => esc(id)).join(',') : esc('')})
      AND qp.status = 'active'
      ORDER BY RANDOM()
      LIMIT ${esc(config.min - questionIds.length)}
    `)
    questionIds.push(...fallback.rows.map(r => (r as any).id))
  }

  const poolId = crypto.randomUUID()
  const questionIdsJson = JSON.stringify(questionIds)
  await dbClient.execute(`
    INSERT INTO quiz_pool_history (id, pool_type, generated_at, question_ids_json, date)
    VALUES (${esc(poolId)}, 'weekly', ${esc(new Date().toISOString())}, ${esc(questionIdsJson)}, ${esc(weekStart)})
  `)

  return { success: true, questionIds }
}

export async function getDailyPoolQuestions(): Promise<any[]> {
  const today = getTodayDate()
  const result = await dbClient.execute(`
    SELECT question_ids_json FROM quiz_pool_history
    WHERE pool_type = 'daily' AND date = ${esc(today)}
    ORDER BY generated_at DESC LIMIT 1
  `)

  if (result.rows.length === 0) {
    await generateDailyPool()
    return getDailyPoolQuestions()
  }

  const questionIds = JSON.parse((result.rows[0] as any).question_ids_json) as string[]
  if (questionIds.length === 0) return []

  const placeholders = questionIds.map(() => '?').join(',')
  const questions = await dbClient.execute({
    sql: `SELECT * FROM quiz_questions WHERE id IN (${placeholders})`,
    args: questionIds,
  })

  return (questions.rows as any[]).map(q => ({
    ...q,
    options: q.options_json ? JSON.parse(q.options_json) : null,
  }))
}

export async function getWeeklyPoolQuestions(): Promise<any[]> {
  const weekStart = getWeekStart()
  const result = await dbClient.execute(`
    SELECT question_ids_json FROM quiz_pool_history
    WHERE pool_type = 'weekly' AND date = ${esc(weekStart)}
    ORDER BY generated_at DESC LIMIT 1
  `)

  if (result.rows.length === 0) {
    await generateWeeklyPool()
    return getWeeklyPoolQuestions()
  }

  const questionIds = JSON.parse((result.rows[0] as any).question_ids_json) as string[]
  if (questionIds.length === 0) return []

  const placeholders = questionIds.map(() => '?').join(',')
  const questions = await dbClient.execute({
    sql: `SELECT * FROM quiz_questions WHERE id IN (${placeholders})`,
    args: questionIds,
  })

  return (questions.rows as any[]).map(q => ({
    ...q,
    options: q.options_json ? JSON.parse(q.options_json) : null,
  }))
}

export async function getTodayPoolStatus(): Promise<{
  dailyGenerated: boolean
  weeklyGenerated: boolean
  dailyQuestionCount: number
  weeklyQuestionCount: number
}> {
  const today = getTodayDate()
  const weekStart = getWeekStart()

  const daily = await dbClient.execute(
    `SELECT question_ids_json FROM quiz_pool_history WHERE pool_type = 'daily' AND date = ${esc(today)} LIMIT 1`
  )
  const weekly = await dbClient.execute(
    `SELECT question_ids_json FROM quiz_pool_history WHERE pool_type = 'weekly' AND date = ${esc(weekStart)} LIMIT 1`
  )

  return {
    dailyGenerated: daily.rows.length > 0,
    weeklyGenerated: weekly.rows.length > 0,
    dailyQuestionCount: daily.rows.length > 0 ? JSON.parse((daily.rows[0] as any).question_ids_json).length : 0,
    weeklyQuestionCount: weekly.rows.length > 0 ? JSON.parse((weekly.rows[0] as any).question_ids_json).length : 0,
  }
}
