import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const cols = await db.run(sql`PRAGMA table_info(orders);`);
  console.log(JSON.stringify(cols.rows));
}
main().catch((e)=>{console.error(e);process.exit(1);});
