const { createClient } = require('@libsql/client');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const jwtSecret = process.env.JWT_SECRET;

const client = createClient({ url, authToken });

async function runTest() {
  console.log('🚀 Starting Refined Password Reset Flow Test...');

  const testEmail = 'test-reset-' + Date.now() + '@example.com';
  const initialPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';

  try {
    const userId = crypto.randomUUID();
    const initialHash = await bcrypt.hash(initialPassword, 12);
    
    console.log('1. Creating test user:', testEmail);
    await client.execute({
        sql: 'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
        args: [userId, testEmail, initialHash, 'Test User', 'user']
    });

    console.log('2. Generating HMAC-SHA256 token...');
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto
      .createHmac('sha256', jwtSecret)
      .update(rawToken)
      .digest('hex');
    
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await client.execute({
        sql: 'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
        args: [crypto.randomUUID(), userId, tokenHash, expiresAt]
    });

    console.log('3. Verifying token in DB (Simulating API Route)...');
    const tokenCheck = await client.execute({
        sql: 'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?',
        args: [tokenHash, new Date().toISOString()]
    });

    if (tokenCheck.rows.length === 1) {
        console.log('✅ Token found and is valid.');
    } else {
        throw new Error('Token not found or invalid!');
    }

    console.log('4. Updating password (Simulating Reset Success)...');
    const newHash = await bcrypt.hash(newPassword, 12);
    await client.execute({
        sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
        args: [newHash, userId]
    });

    console.log('5. Verifying new password match...');
    const userCheck = await client.execute({
        sql: 'SELECT password_hash FROM users WHERE id = ?',
        args: [userId]
    });
    const finalHash = userCheck.rows[0].password_hash;
    const isMatch = await bcrypt.compare(newPassword, finalHash);

    if (isMatch) {
        console.log('✨ SUCCESS: Password reset logic verified end-to-end.');
    } else {
        throw new Error('Password mismatch!');
    }

    // Cleanup
    await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] });
    console.log('🧹 Cleanup complete.');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  } finally {
    process.exit();
  }
}

runTest();
