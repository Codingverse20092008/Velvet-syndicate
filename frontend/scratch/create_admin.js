const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: 'libsql://velvet-syndicate-mehefuz-creates-56.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY5NDI5ODAsImlkIjoiMDE5ZGJhMGQtZmYwMS03ZTY2LTk5ZjctMzgyODIwZTE0MTRjIiwicmlkIjoiZTdhMWM4NjItZmUxZS00NDkxLThhNmYtMWI5MzI0ZjA1MmZhIn0.-EKngRnk_pchevnen4rcMdVsC8LTD_0n3Foe8T7xZ38IXz1iwEmiDqm5nKFxQC1GlmFqq40gYHrRv5u4e4l8Ag',
});

async function main() {
  const email = 'admin@velvetsyndicate.shop';
  const password = 'Admin@12345678';
  const name = 'System Admin';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const id = '00000000-0000-0000-0000-000000000001';

  await client.execute({
    sql: "INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, 'admin', 1)",
    args: [id, name, email, passwordHash]
  });

  console.log("Successfully created/updated admin account:");
  console.log("Email:", email);
  console.log("Pass:", password);
  process.exit(0);
}

main().catch(console.error);
