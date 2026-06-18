import * as dotenv from 'dotenv'
import { join } from 'path'
dotenv.config({ path: join(__dirname, '../../.env.local') })
import { createClient } from '@libsql/client'

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function main() {
  // List packs
  const packs = await c.execute('SELECT id, pack_name, version, status FROM quiz_packs ORDER BY version ASC')
  console.log('Current packs:')
  for (const p of packs.rows) {
    const pack = p as any
    console.log(`  ${pack.pack_name} v${pack.version} [${pack.status}] (${pack.id})`)
  }

  // Deactivate v1
  const v1 = packs.rows.find((p: any) => p.version === 1)
  if (v1) {
    await c.execute('UPDATE quiz_packs SET status = ? WHERE id = ?', ['inactive', (v1 as any).id])
    console.log('\nDeactivated v1')
  }

  // Delete pool history
  await c.execute('DELETE FROM quiz_pool_history')
  console.log('Pool history cleared')

  // Verify v2 is active
  const v2Check = await c.execute('SELECT id, version, status FROM quiz_packs WHERE version = 2')
  if (v2Check.rows.length > 0) {
    console.log('v2 status:', (v2Check.rows[0] as any).status)
  }

  console.log('\nReady for pool regeneration via API')
}

main().catch(console.error)
