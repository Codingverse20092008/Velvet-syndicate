const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'libsql://velvet-syndicate-mehefuz-creates-56.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY5NDI5ODAsImlkIjoiMDE5ZGJhMGQtZmYwMS03ZTY2LTk5ZjctMzgyODIwZTE0MTRjIiwicmlkIjoiZTdhMWM4NjItZmUxZS00NDkxLThhNmYtMWI5MzI0ZjA1MmZhIn0.-EKngRnk_pchevnen4rcMdVsC8LTD_0n3Foe8T7xZ38IXz1iwEmiDqm5nKFxQC1GlmFqq40gYHrRv5u4e4l8Ag',
});

async function main() {
  await client.execute("UPDATE users SET role = 'admin' WHERE email = 'velvetsyndicate892@gmail.com'");
  console.log("Successfully promoted velvetsyndicate892@gmail.com to admin");
  process.exit(0);
}

main().catch(console.error);
