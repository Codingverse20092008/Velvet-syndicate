import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../db';
import { users } from '../schema';
import { hashPassword } from '../auth';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';

async function seedAdmin() {
  const email = 'admin@velvetsyndicate.com';
  const password = 'VelvetAdmin2026!';
  const name = 'Velvet Admin';

  console.log(`🚀 Seeding admin user: ${email}...`);

  try {
    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      console.log('⚠️  Admin user already exists. Updating role to admin...');
      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, existing.id));
      console.log('✅ Admin role updated successfully.');
      return;
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash: hashedPassword,
      role: 'admin',
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log('-----------------------------------');
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin().then(() => process.exit(0));
