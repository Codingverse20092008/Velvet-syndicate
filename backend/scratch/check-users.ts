import { db } from '../src/lib/db';
import { users } from '../src/lib/schema';

async function main() {
  console.log('Fetching users...');
  const allUsers = await db.select().from(users);
  console.log('Users:', JSON.stringify(allUsers, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
