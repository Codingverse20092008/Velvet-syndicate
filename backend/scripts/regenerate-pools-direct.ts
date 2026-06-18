import * as dotenv from 'dotenv'
import { join } from 'path'
dotenv.config({ path: join(__dirname, '../../.env.local') })
import { createClient } from '@libsql/client'
import crypto from 'crypto'

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  return `'${String(val).replace(/'/g, "''")}'`
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

async function getRecentlyUsed(daysBack: number): Promise<Set<string>> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffDate = cutoff.toISOString().slice(0, 10)
  const result = await c.execute(`
    SELECT question_ids_json FROM quiz_pool_history
    WHERE date >= ${esc(cutoffDate)}
    ORDER BY generated_at DESC
  `)
  const ids = new Set<string>()
  for (const row of result.rows) {
    try {
      const parsed = JSON.parse((row as any).question_ids_json)
      if (Array.isArray(parsed)) parsed.forEach((id: string) => ids.add(id))
    } catch { }
  }
  return ids
}

async function main() {
  console.log('=== Regenerating Pools ===\n')

  // Already cleared pool history, so regenerate

  // Daily pool - 3 easy + 2 medium + 1 hard
  console.log('Generating daily pool...')
  const recentlyUsed = await getRecentlyUsed(7)
  const dailyIds: string[] = []

  const categories = await c.execute(`
    SELECT DISTINCT qq.category FROM quiz_questions qq
    JOIN quiz_packs qp ON qp.id = qq.pack_id
    WHERE qq.category IS NOT NULL AND qp.status = 'active'
  `)
  const cats = categories.rows.map(r => (r as any).category).filter(Boolean)
  console.log('Active categories:', cats)

  for (const [difficulty, count] of Object.entries({ easy: 3, medium: 2, hard: 1 })) {
    const pickedCat = cats[Math.floor(Math.random() * cats.length)]
    const result = await c.execute(`
      SELECT qq.id FROM quiz_questions qq
      JOIN quiz_packs qp ON qp.id = qq.pack_id
      WHERE qq.difficulty = ${esc(difficulty)}
      AND qq.category = ${esc(pickedCat)}
      AND qp.status = 'active'
      ORDER BY RANDOM()
      LIMIT ${esc(count * 2)}
    `)
    const candidates = result.rows.map(r => (r as any).id).filter((id: string) => !recentlyUsed.has(id))
    dailyIds.push(...candidates.slice(0, count))
  }

  if (dailyIds.length < 3) {
    const fallback = await c.execute(`
      SELECT qq.id FROM quiz_questions qq
      JOIN quiz_packs qp ON qp.id = qq.pack_id
      WHERE qq.id NOT IN (${dailyIds.map(id => esc(id)).join(',') || esc('')})
      AND qp.status = 'active'
      ORDER BY RANDOM()
      LIMIT ${esc(6 - dailyIds.length)}
    `)
    dailyIds.push(...fallback.rows.map(r => (r as any).id))
  }

  // Store daily pool
  const dpId = crypto.randomUUID()
  await c.execute(`
    INSERT INTO quiz_pool_history (id, pool_type, generated_at, question_ids_json, date)
    VALUES (${esc(dpId)}, 'daily', ${esc(new Date().toISOString())}, ${esc(JSON.stringify(dailyIds))}, ${esc(getTodayDate())})
  `)
  console.log('Daily pool:', dailyIds.length, 'questions')

  // Weekly pool - 20-30
  console.log('\nGenerating weekly pool...')
  const weeklyRecently = await getRecentlyUsed(14)
  const target = 20 + Math.floor(Math.random() * 11)

  const weeklyResult = await c.execute(`
    SELECT qq.id FROM quiz_questions qq
    JOIN quiz_packs qp ON qp.id = qq.pack_id
    WHERE qp.status = 'active'
    ORDER BY RANDOM()
    LIMIT ${esc(target * 2)}
  `)
  const weeklyCandidates = weeklyResult.rows.map(r => (r as any).id).filter((id: string) => !weeklyRecently.has(id))
  const weeklyIds = weeklyCandidates.slice(0, target)

  if (weeklyIds.length < 20) {
    const fallback = await c.execute(`
      SELECT qq.id FROM quiz_questions qq
      JOIN quiz_packs qp ON qp.id = qq.pack_id
      WHERE qq.id NOT IN (${weeklyIds.map(id => esc(id)).join(',') || esc('')})
      AND qp.status = 'active'
      ORDER BY RANDOM()
      LIMIT ${esc(20 - weeklyIds.length)}
    `)
    weeklyIds.push(...fallback.rows.map(r => (r as any).id))
  }

  const wpId = crypto.randomUUID()
  await c.execute(`
    INSERT INTO quiz_pool_history (id, pool_type, generated_at, question_ids_json, date)
    VALUES (${esc(wpId)}, 'weekly', ${esc(new Date().toISOString())}, ${esc(JSON.stringify(weeklyIds))}, ${esc(getWeekStart())})
  `)
  console.log('Weekly pool:', weeklyIds.length, 'questions')

  // Verify
  console.log('\nVerifying daily pool composition...')
  const dph = dailyIds.map(id => esc(id)).join(',')
  if (dailyIds.length > 0) {
    const dq = await c.execute(`SELECT difficulty, category, COUNT(*) as cnt FROM quiz_questions WHERE id IN (${dph}) GROUP BY difficulty, category`)
    ;(dq.rows as any[]).forEach(r => console.log(`  ${r.difficulty}/${r.category}: ${r.cnt}`))
  }

  console.log('\nVerifying weekly pool composition...')
  const wph = weeklyIds.map(id => esc(id)).join(',')
  if (weeklyIds.length > 0) {
    const wq = await c.execute(`SELECT difficulty, category, COUNT(*) as cnt FROM quiz_questions WHERE id IN (${wph}) GROUP BY difficulty, category`)
    ;(wq.rows as any[]).forEach(r => console.log(`  ${r.difficulty}/${r.category}: ${r.cnt}`))
  }

  console.log('\nChecking overlap...')
  const dailySet = new Set(dailyIds)
  const overlap = weeklyIds.filter(id => dailySet.has(id))
  console.log('Daily/weekly overlap:', overlap.length)

  console.log('\n✅ Pools regenerated')
}

main().catch(console.error)
