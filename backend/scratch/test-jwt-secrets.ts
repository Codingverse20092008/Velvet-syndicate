import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import jwt from 'jsonwebtoken';
import * as jose from 'jose';

async function run() {
  const backendEnvPath = path.join(__dirname, '../.env.local');
  const frontendEnvPath = path.join(__dirname, '../../frontend/.env.local');

  console.log('Backend env exists:', fs.existsSync(backendEnvPath));
  console.log('Frontend env exists:', fs.existsSync(frontendEnvPath));

  // Load backend env
  const backendEnv = dotenv.parse(fs.readFileSync(backendEnvPath));
  const backendSecret = backendEnv.JWT_SECRET;
  console.log('Backend secret: ', JSON.stringify(backendSecret));

  // Load frontend env
  const frontendEnv = dotenv.parse(fs.readFileSync(frontendEnvPath));
  const frontendSecret = frontendEnv.JWT_SECRET;
  console.log('Frontend secret:', JSON.stringify(frontendSecret));

  const payload = { userId: '123-test-id', email: 'test@example.com', role: 'user' };
  
  // Sign token using backend method
  const token = jwt.sign({ ...payload, type: 'access' }, backendSecret, { expiresIn: '15m' });
  console.log('Signed token:', token);

  // Verify token using backend secret (backend method)
  try {
    const verifiedBackend = jwt.verify(token, backendSecret);
    console.log('Backend verification succeeded:', verifiedBackend);
  } catch (err) {
    console.log('Backend verification failed:', (err as Error).message);
  }

  // Verify token using frontend secret (frontend method)
  try {
    const secretBytes = new TextEncoder().encode(frontendSecret || 'velvet-syndicate-super-secret-jwt-key-change-in-production-please');
    const { payload: verifiedFrontend } = await jose.jwtVerify(token, secretBytes);
    console.log('Frontend verification succeeded:', verifiedFrontend);
  } catch (err) {
    console.log('Frontend verification failed:', (err as Error).message);
  }
}

run().catch(console.error);
