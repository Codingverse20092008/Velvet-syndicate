import * as dotenv from 'dotenv'
import { join } from 'path'
dotenv.config({ path: join(__dirname, '../../.env.local') })

import { readFileSync, writeFileSync } from 'fs'
import { dbClient } from '../src/lib/db'
import { validateQuizPack } from '../src/services/quiz-pack/validation.service'
import { importQuizPack } from '../src/services/quiz-pack/import.service'
import { generateDailyPool, generateWeeklyPool } from '../src/services/quiz-pack/pool.service'

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  return `'${String(val).replace(/'/g, "''")}'`
}

async function main() {
  console.log('=== Velvet Vault — Sneaker Quiz Pack Import ===\n')

  // ── Step 1: Read & Transform ──────────────────────────────────────
  console.log('📖 Reading quiz pack file...')
  const raw = JSON.parse(readFileSync('D:/Velvet/gemini-code-1781798355841.json', 'utf-8'))

  if (!raw.quiz_title || !Array.isArray(raw.questions)) {
    console.error('❌ Invalid file structure: missing quiz_title or questions array')
    process.exit(1)
  }

  console.log(`   Title: ${raw.quiz_title}`)
  console.log(`   Questions: ${raw.questions.length}`)

  // ── Step 2: Validate Source Data ──────────────────────────────────
  console.log('\n🔍 Validating source structure...')
  const sourceErrors: string[] = []

  for (let i = 0; i < raw.questions.length; i++) {
    const q = raw.questions[i]
    const qn = i + 1

    if (!q.question || typeof q.question !== 'string') {
      sourceErrors.push(`Q#${qn}: Missing question text`)
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      sourceErrors.push(`Q#${qn}: Missing or insufficient options`)
    }
    if (!q.correctAnswer) {
      sourceErrors.push(`Q#${qn}: Missing correctAnswer`)
    } else if (Array.isArray(q.options) && !q.options.includes(q.correctAnswer)) {
      sourceErrors.push(`Q#${qn}: correctAnswer "${q.correctAnswer}" not in options`)
    }
    if (typeof q.xp !== 'number' || q.xp < 0) {
      sourceErrors.push(`Q#${qn}: Invalid XP: ${q.xp}`)
    }
    if (typeof q.coins !== 'number' || q.coins < 0) {
      sourceErrors.push(`Q#${qn}: Invalid coins: ${q.coins}`)
    }
    if (!q.explanation || typeof q.explanation !== 'string') {
      sourceErrors.push(`Q#${qn}: Missing explanation`)
    }
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
      sourceErrors.push(`Q#${qn}: Invalid difficulty: ${q.difficulty}`)
    }
    if (!['mcq', 'fill_blank', 'true_false', 'multi_select'].includes(q.type)) {
      sourceErrors.push(`Q#${qn}: Invalid type: ${q.type}`)
    }
  }

  if (sourceErrors.length > 0) {
    console.error(`\n❌ ${sourceErrors.length} validation error(s):`)
    sourceErrors.forEach(e => console.error(`   • ${e}`))
    process.exit(1)
  }

  console.log(`   ✅ All ${raw.questions.length} questions pass source validation`)

  // ── Step 3: Report ID duplicates & gaps ──────────────────────────
  const ids = raw.questions.map((q: any) => q.id)
  const duplicateIds = ids.filter((id: number, idx: number) => ids.indexOf(id) !== idx)
  if (duplicateIds.length > 0) {
    console.warn(`   ⚠️ Duplicate IDs found: ${[...new Set(duplicateIds)].join(', ')}`)
  }

  const missingIds = []
  for (let i = 1; i <= raw.total_questions; i++) {
    if (!ids.includes(i)) missingIds.push(i)
  }
  if (missingIds.length > 0) {
    console.warn(`   ⚠️ Missing IDs: ${missingIds.join(', ')}`)
  } else {
    console.log(`   ✅ All IDs 1–${raw.total_questions} present`)
  }

  // ── Step 4: Transform to Expected Format ──────────────────────────
  console.log('\n🔄 Transforming to system format...')

  const categoryCounts: Record<string, number> = {}
  const diffCounts: Record<string, number> = { easy: 0, medium: 0, hard: 0 }
  let totalXp = 0
  let totalCoins = 0

  for (const q of raw.questions) {
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1
    diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1
    totalXp += q.xp || 10
    totalCoins += q.coins || 0
  }

  const mainCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0]

  const transformed = {
    packName: raw.quiz_title,
    description: `A comprehensive ${raw.total_questions}-question quiz covering sneaker culture: brands, models, history, and terminology. Categories: ${Object.keys(categoryCounts).join(', ')}. Difficulties: ${Object.entries(diffCounts).map(([k, v]) => `${k}=${v}`).join(', ')}.`,
    category: mainCategory,
    difficulty: 'mixed',
    reward: {},
    questions: raw.questions.map((q: any) => ({
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      xp: q.xp,
      coins: q.coins,
      explanation: q.explanation,
      difficulty: q.difficulty,
      category: q.category,
    })),
  }

  console.log(`   Pack: "${transformed.packName}"`)
  console.log(`   Category: ${transformed.category} (+ ${Object.keys(categoryCounts).length - 1} more)`)
  console.log(`   Difficulty: mixed (easy=${diffCounts.easy}, medium=${diffCounts.medium}, hard=${diffCounts.hard})`)
  console.log(`   Total XP: ${totalXp}`)
  console.log(`   Total Coins: ${totalCoins}`)

  // Save transformed file for reference
  const transformedPath = 'D:/Velvet/backend/scripts/transformed-sneaker-pack.json'
  writeFileSync(transformedPath, JSON.stringify(transformed, null, 2))
  console.log(`\n   📄 Transformed JSON saved to: ${transformedPath}`)

  // ── Step 5: Validate via System Validation Service ────────────────
  console.log('\n🔍 Running system validation...')
  const validationResult = validateQuizPack(transformed)

  if (!validationResult.valid) {
    console.error('\n❌ System validation FAILED:')
    validationResult.errors.forEach(e => {
      console.error(`   • Q#${e.questionNumber} [${e.field}]: ${e.message}`)
    })
    process.exit(1)
  }

  console.log(`   ✅ Validation passed`)
  console.log(`   Questions: ${validationResult.questionCount}`)
  console.log(`   Total XP: ${validationResult.totalXp}`)
  console.log(`   Total Coins: ${validationResult.totalCoins}`)

  // ── Step 6: Check for existing pack ──────────────────────────────
  console.log('\n🔍 Checking for existing pack...')
  const existingCheck = await dbClient.execute(
    `SELECT id, pack_name, version FROM quiz_packs WHERE pack_name = ${esc(transformed.packName)} ORDER BY version DESC LIMIT 1`
  )
  const action = existingCheck.rows.length > 0 ? 'create_new' : 'create_new'
  if (existingCheck.rows.length > 0) {
    const existing = existingCheck.rows[0] as any
    console.log(`   ⚠️ Existing pack found: "${existing.pack_name}" v${existing.version}. Creating new version.`)
  } else {
    console.log('   ✅ No existing pack — fresh import')
  }

  // ── Step 7: Import ────────────────────────────────────────────────
  console.log('\n📦 Importing quiz pack...')
  const importResult = await importQuizPack(validationResult, transformed.questions, action, 'system-import')

  if (!importResult.success) {
    console.error(`\n❌ Import failed: ${importResult.errors?.join(', ') || 'Unknown error'}`)
    process.exit(1)
  }

  console.log(`   ✅ Pack imported successfully!`)
  console.log(`   Pack ID: ${importResult.packId}`)
  console.log(`   Version: v${importResult.version}`)
  console.log(`   Questions imported: ${importResult.questionsImported}`)
  console.log(`   Questions failed: ${importResult.questionsFailed}`)
  console.log(`   Total XP: ${importResult.totalXp}`)
  console.log(`   Total Coins: ${importResult.totalCoins}`)

  // ── Step 8: Verify DB ──────────────────────────────────────────────
  console.log('\n🔎 Verifying database...')
  const packVerify = await dbClient.execute(
    `SELECT id, pack_name, version, question_count, total_xp, total_coins, status, imported_at FROM quiz_packs WHERE id = ${esc(importResult.packId)}`
  )
  const pack = packVerify.rows[0] as any
  console.log(`   Pack: ${pack.pack_name} (v${pack.version})`)
  console.log(`   Status: ${pack.status}`)
  console.log(`   Questions: ${pack.question_count}`)
  console.log(`   Total XP: ${pack.total_xp}`)
  console.log(`   Total Coins: ${pack.total_coins}`)
  console.log(`   Imported at: ${pack.imported_at}`)

  const qVerify = await dbClient.execute(
    `SELECT COUNT(*) as cnt FROM quiz_questions WHERE pack_id = ${esc(importResult.packId)}`
  )
  const questionCount = (qVerify.rows[0] as any).cnt
  console.log(`   Questions stored: ${questionCount}`)

  if (questionCount !== 50) {
    console.error(`   ❌ Expected 50 questions, got ${questionCount}`)
    process.exit(1)
  }

  // ── Step 9: Generate Quiz Pools ───────────────────────────────────
  console.log('\n🌊 Generating daily quiz pool (3 easy + 2 medium + 1 hard)...')
  try {
    const dailyResult = await generateDailyPool()
    console.log(`   ✅ Daily pool: ${JSON.stringify(dailyResult)}`)
  } catch (err: any) {
    console.warn(`   ⚠️ Daily pool generation: ${err.message || err}`)
  }

  console.log('\n🌊 Generating weekly mega quiz pool (20–30 questions)...')
  try {
    const weeklyResult = await generateWeeklyPool()
    console.log(`   ✅ Weekly pool: ${JSON.stringify(weeklyResult)}`)
  } catch (err: any) {
    console.warn(`   ⚠️ Weekly pool generation: ${err.message || err}`)
  }

  // ── Step 10: Verify Pools ─────────────────────────────────────────
  console.log('\n🔎 Verifying pool contents...')
  const dailyPoolCheck = await dbClient.execute(
    `SELECT COUNT(*) as cnt FROM quiz_pool_history WHERE pool_type = 'daily' AND generated_date = date('now')`
  )
  console.log(`   Daily pool size: ${(dailyPoolCheck.rows[0] as any).cnt}`)

  const weeklyPoolCheck = await dbClient.execute(
    `SELECT COUNT(*) as cnt FROM quiz_pool_history WHERE pool_type = 'weekly' AND strftime('%Y-%W', generated_date) = strftime('%Y-%W', 'now')`
  )
  console.log(`   Weekly pool size: ${(weeklyPoolCheck.rows[0] as any).cnt}`)

  // ── Summary ───────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`
  Pack:         ${pack.pack_name} (v${pack.version})
  Pack ID:      ${importResult.packId}
  Questions:    ${questionCount} / ${raw.total_questions}
  Categories:   ${Object.keys(categoryCounts).join(', ')}
  Difficulties: easy=${diffCounts.easy}, medium=${diffCounts.medium}, hard=${diffCounts.hard}
  Total XP:     ${totalXp}
  Total Coins:  ${totalCoins}
  Daily Pool:   ${(dailyPoolCheck.rows[0] as any).cnt} questions
  Weekly Pool:  ${(weeklyPoolCheck.rows[0] as any).cnt} questions
  `)

  if (importResult.errors && importResult.errors.length > 0) {
    console.warn(`  ⚠️ ${importResult.errors.length} question(s) had import warnings:`)
    importResult.errors.forEach(e => console.warn(`     • ${e}`))
  }

  console.log('✅ Import complete — all systems operational')
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
