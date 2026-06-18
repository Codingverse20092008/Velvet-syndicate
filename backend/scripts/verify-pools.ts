import * as dotenv from 'dotenv'
import { join } from 'path'
dotenv.config({ path: join(__dirname, '../../.env.local') })
import { createClient } from '@libsql/client'

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function main() {
  // Daily pool
  const daily = await c.execute(
    `SELECT * FROM quiz_pool_history WHERE pool_type = 'daily' AND date = date('now') LIMIT 1`
  )
  if (daily.rows.length > 0) {
    const ids = JSON.parse((daily.rows[0] as any).question_ids_json)
    console.log('Daily pool: ' + ids.length + ' questions')
    const placeholders = ids.map(() => '?').join(',')
    const qs = await c.execute(
      `SELECT question, difficulty, category FROM quiz_questions WHERE id IN (${placeholders})`,
      ids
    )
    ;(qs.rows as any[]).forEach((r, i) => {
      console.log(`  ${i+1}. [${r.difficulty}|${r.category}] ${r.question.substring(0, 60)}`)
    })
  }

  // Weekly pool
  const weekly = await c.execute(
    `SELECT * FROM quiz_pool_history WHERE pool_type = 'weekly' AND strftime('%Y-%W', date) = strftime('%Y-%W', 'now') LIMIT 1`
  )
  if (weekly.rows.length > 0) {
    const ids = JSON.parse((weekly.rows[0] as any).question_ids_json)
    console.log('\nWeekly pool: ' + ids.length + ' questions')
    const placeholders = ids.map(() => '?').join(',')
    const qs = await c.execute(
      `SELECT difficulty, category, COUNT(*) as cnt FROM quiz_questions WHERE id IN (${placeholders}) GROUP BY difficulty, category`,
      ids
    )
    ;(qs.rows as any[]).forEach(r => {
      console.log(`  ${r.difficulty}/${r.category}: ${r.cnt}`)
    })
  }

  // Check for duplicate questions in weekly pool
  if (weekly.rows.length > 0) {
    const ids = JSON.parse((weekly.rows[0] as any).question_ids_json)
    const uniqueIds = new Set(ids)
    console.log(`\nWeekly pool duplicates: ${ids.length - uniqueIds.size}`)
  }

  // Check for recently used overlap
  const recent = await c.execute(
    `SELECT DISTINCT json_each.value as qid FROM quiz_pool_history, json_each(quiz_pool_history.question_ids_json) WHERE pool_type = 'daily' AND date = date('now')`
  )
  if (weekly.rows.length > 0) {
    const dailyIds = new Set((recent.rows as any[]).map(r => r.qid))
    const weeklyIds = JSON.parse((weekly.rows[0] as any).question_ids_json)
    const overlap = weeklyIds.filter((id: string) => dailyIds.has(id))
    console.log(`Overlap between daily and weekly: ${overlap.length}`)
  }

  console.log('\n✅ Pool verification complete')
}

main().catch(console.error)
