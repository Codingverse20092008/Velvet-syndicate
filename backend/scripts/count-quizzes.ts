import { db } from '../src/lib/db';
import { quizzes } from '../src/lib/schema';
import { sql } from 'drizzle-orm';

async function main() {
  const today = new Date().toISOString().split('T')[0];
  const todayResult = await db
    .select({ count: sql`count(*)` })
    .from(quizzes)
    .where(sql`generated_date = ${today}`);

  const totalResult = await db
    .select({ count: sql`count(*)` })
    .from(quizzes);

  console.log('TODAY', today, 'COUNT', todayResult[0]?.count ?? 0);
  console.log('TOTAL COUNT', totalResult[0]?.count ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
