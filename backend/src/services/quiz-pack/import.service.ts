import crypto from 'crypto'
import { dbClient } from '../../lib/db'
import type { ValidationResult } from './validation.service'
import { getTodayDate } from '../vault.service'

export interface VersionCheckResult {
  existing: boolean
  currentVersion: number
  latestVersion: number
}

export interface ImportResult {
  success: boolean
  packId: string
  packName: string
  category: string
  difficulty: string
  version: number
  questionsImported: number
  questionsFailed: number
  totalXp: number
  totalCoins: number
  errors?: string[]
}

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  return `'${String(val).replace(/'/g, "''")}'`
}

export async function checkExistingPack(packName: string): Promise<VersionCheckResult | null> {
  const result = await dbClient.execute(
    `SELECT id, pack_name, version FROM quiz_packs WHERE pack_name = ${esc(packName)} ORDER BY version DESC LIMIT 1`
  )
  if (result.rows.length === 0) return null
  const row = result.rows[0] as any
  return { existing: true, currentVersion: row.version, latestVersion: row.version }
}

export interface ImportQuestion {
  type: string
  question: string
  correctAnswer: string
  options?: string[]
  xp?: number
  coins?: number
  explanation?: string
  difficulty?: string
  category?: string
}

export async function importQuizPack(
  validationResult: ValidationResult,
  questions: ImportQuestion[],
  action: 'create_new' | 'update_existing',
  importedBy?: string
): Promise<ImportResult> {
  if (!validationResult.valid) {
    return {
      success: false, packId: '', packName: validationResult.packName,
      category: validationResult.category, difficulty: validationResult.difficulty,
      version: 0, questionsImported: 0, questionsFailed: 0,
      totalXp: 0, totalCoins: 0, errors: ['Cannot import invalid pack'],
    }
  }

  const existing = await checkExistingPack(validationResult.packName)
  let version = 1
  if (existing) {
    version = action === 'create_new' ? existing.latestVersion + 1 : existing.latestVersion
  }

  const packId = crypto.randomUUID()
  const today = getTodayDate()

  await dbClient.execute(`
    INSERT INTO quiz_packs (id, pack_name, description, category, difficulty, version,
      question_count, total_xp, total_coins, status, imported_by, imported_at, created_at, updated_at)
    VALUES (${esc(packId)}, ${esc(validationResult.packName)}, ${esc(validationResult.description)},
      ${esc(validationResult.category)}, ${esc(validationResult.difficulty)}, ${esc(version)},
      ${esc(questions.length)}, ${esc(validationResult.totalXp)}, ${esc(validationResult.totalCoins)},
      'active', ${esc(importedBy || null)}, ${esc(today)}, ${esc(today)}, ${esc(today)})
  `)

  let questionsImported = 0
  let questionsFailed = 0
  const errors: string[] = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    try {
      const questionId = crypto.randomUUID()
      const type = q.type || 'mcq'
      const optionsJson = q.options ? JSON.stringify(q.options) : null
      const difficulty = q.difficulty || 'medium'
      const category = q.category || validationResult.category
      const xp = q.xp || 10
      const coins = q.coins || 0

      await dbClient.execute(`
        INSERT INTO quiz_questions (id, pack_id, type, question, options_json, correct_answer, xp, coins, explanation, difficulty, category)
        VALUES (${esc(questionId)}, ${esc(packId)}, ${esc(type)}, ${esc(q.question)},
          ${esc(optionsJson)}, ${esc(q.correctAnswer)}, ${esc(xp)}, ${esc(coins)},
          ${esc(q.explanation || null)}, ${esc(difficulty)}, ${esc(category)})
      `)
      questionsImported++
    } catch (err: any) {
      questionsFailed++
      errors.push(`Question #${i + 1}: ${err.message || 'Unknown error'}`)
    }
  }

  const logId = crypto.randomUUID()
  const metadata = JSON.stringify({ action, previousVersion: existing?.currentVersion || null, importedAt: today })

  await dbClient.execute(`
    INSERT INTO quiz_pack_import_logs (id, pack_id, questions_imported, questions_failed, imported_by, imported_at, metadata)
    VALUES (${esc(logId)}, ${esc(packId)}, ${esc(questionsImported)}, ${esc(questionsFailed)},
      ${esc(importedBy || null)}, ${esc(today)}, ${esc(metadata)})
  `)

  return {
    success: questionsFailed === 0,
    packId, packName: validationResult.packName,
    category: validationResult.category, difficulty: validationResult.difficulty,
    version, questionsImported, questionsFailed,
    totalXp: validationResult.totalXp, totalCoins: validationResult.totalCoins,
    errors: errors.length > 0 ? errors : undefined,
  }
}

export async function getPacks(
  filters?: { status?: string; category?: string; search?: string },
  limit: number = 50,
  offset: number = 0
): Promise<{ packs: any[]; total: number }> {
  const conditions: string[] = []
  if (filters?.status) conditions.push(`qp.status = ${esc(filters.status)}`)
  if (filters?.category) conditions.push(`qp.category = ${esc(filters.category)}`)
  if (filters?.search) conditions.push(`qp.pack_name LIKE ${esc(`%${filters.search}%`)}`)

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await dbClient.execute(`SELECT COUNT(*) as total FROM quiz_packs qp ${where}`)
  const total = (countResult.rows[0] as any)?.total || 0

  const result = await dbClient.execute(`
    SELECT qp.*, u.name as imported_by_name
    FROM quiz_packs qp
    LEFT JOIN users u ON u.id = qp.imported_by
    ${where}
    ORDER BY qp.imported_at DESC
    LIMIT ${esc(limit)} OFFSET ${esc(offset)}
  `)

  return { packs: result.rows as any[], total }
}

export async function getPackById(packId: string): Promise<any | null> {
  const result = await dbClient.execute(
    `SELECT * FROM quiz_packs WHERE id = ${esc(packId)} LIMIT 1`
  )
  return result.rows.length > 0 ? result.rows[0] as any : null
}

export async function getQuestionsByPackId(packId: string, limit: number = 100, offset: number = 0): Promise<any[]> {
  const result = await dbClient.execute(`
    SELECT * FROM quiz_questions WHERE pack_id = ${esc(packId)} ORDER BY created_at ASC LIMIT ${esc(limit)} OFFSET ${esc(offset)}
  `)
  return result.rows as any[]
}

export async function deletePack(packId: string): Promise<boolean> {
  await dbClient.execute(`DELETE FROM quiz_questions WHERE pack_id = ${esc(packId)}`)
  await dbClient.execute(`DELETE FROM quiz_pack_import_logs WHERE pack_id = ${esc(packId)}`)
  const result = await dbClient.execute(`DELETE FROM quiz_packs WHERE id = ${esc(packId)}`)
  return result.rowsAffected > 0
}

export async function togglePackStatus(packId: string, status: 'active' | 'inactive' | 'archived'): Promise<boolean> {
  const today = getTodayDate()
  const result = await dbClient.execute(`
    UPDATE quiz_packs SET status = ${esc(status)}, updated_at = ${esc(today)} WHERE id = ${esc(packId)}
  `)
  return result.rowsAffected > 0
}

export async function getImportLogs(packId?: string, limit: number = 50): Promise<any[]> {
  const where = packId ? `WHERE pack_id = ${esc(packId)}` : ''
  const result = await dbClient.execute(`
    SELECT l.*, u.name as imported_by_name
    FROM quiz_pack_import_logs l
    LEFT JOIN users u ON u.id = l.imported_by
    ${where}
    ORDER BY l.imported_at DESC
    LIMIT ${esc(limit)}
  `)
  return result.rows as any[]
}
