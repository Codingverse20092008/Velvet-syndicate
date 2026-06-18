import * as dotenv from 'dotenv'
import { join } from 'path'
dotenv.config({ path: join(__dirname, '../../.env.local') })
import { generateDailyPool, generateWeeklyPool, getDailyPoolQuestions, getWeeklyPoolQuestions, getTodayPoolStatus } from '../src/services/quiz-pack/pool.service'

async function main() {
  console.log('=== Regenerating Pools ===\n')

  console.log('Generating daily pool...')
  const d = await generateDailyPool()
  console.log('Daily pool:', JSON.stringify(d))

  console.log('\nGenerating weekly pool...')
  const w = await generateWeeklyPool()
  console.log('Weekly pool:', JSON.stringify(w))

  console.log('\nVerifying...')
  const dailyQs = await getDailyPoolQuestions()
  console.log('Daily questions:', dailyQs.length)
  const diffs: Record<string, number> = {}
  const cats: Record<string, number> = {}
  for (const q of dailyQs) {
    diffs[q.difficulty] = (diffs[q.difficulty] || 0) + 1
    cats[q.category] = (cats[q.category] || 0) + 1
  }
  console.log('  By difficulty:', JSON.stringify(diffs))
  console.log('  By category:', JSON.stringify(cats))

  const weeklyQs = await getWeeklyPoolQuestions()
  console.log('\nWeekly questions:', weeklyQs.length)
  const wDiffs: Record<string, number> = {}
  const wCats: Record<string, number> = {}
  for (const q of weeklyQs) {
    wDiffs[q.difficulty] = (wDiffs[q.difficulty] || 0) + 1
    wCats[q.category] = (wCats[q.category] || 0) + 1
  }
  console.log('  By difficulty:', JSON.stringify(wDiffs))
  console.log('  By category:', JSON.stringify(wCats))

  const status = await getTodayPoolStatus()
  console.log('\nPool status:', JSON.stringify(status))
  console.log('\n✅ Pools regenerated successfully')
}

main().catch(console.error)
