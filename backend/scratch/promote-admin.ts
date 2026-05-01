import { db } from '../src/lib/db';
import { users } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'test_user_unique_123@example.com';
  console.log(`Promoting ${email} to admin...`);
  const result = await db.update(users)
    .set({ role: 'admin' })
    .where(eq(users.email, email))
    .returning();
  
  if (result.length > 0) {
    console.log('Success! User promoted:', JSON.stringify(result[0], null, 2));
  } else {
    console.log('User not found.');
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
