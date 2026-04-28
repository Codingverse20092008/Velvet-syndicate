
import { db } from '../backend/src/lib/db';
import { users, products, sessions } from '../backend/src/lib/schema';
import { eq } from 'drizzle-orm';

async function testAuth() {
  console.log('--- STARTING AUTH FLOW TEST ---');

  const testUser = {
    name: 'Test User',
    email: 'test' + Date.now() + '@example.com',
    password: 'password123'
  };

  try {
    // 1. Signup
    console.log('Testing Signup...');
    const signupRes = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const signupData = await signupRes.json();
    console.log('Signup Response:', signupRes.status, signupData.success);

    // 2. Duplicate Signup
    console.log('Testing Duplicate Signup...');
    const dupRes = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const dupData = await dupRes.json();
    console.log('Duplicate Signup Response:', dupRes.status, dupData.error);

    // 3. Login
    console.log('Testing Login...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginRes.status, loginData.success);

    // 4. Login Wrong Password
    console.log('Testing Wrong Password...');
    const wrongRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: 'wrong' })
    });
    const wrongData = await wrongRes.json();
    console.log('Wrong Password Response:', wrongRes.status, wrongData.error);

    console.log('--- AUTH FLOW TEST COMPLETE ---');
  } catch (error) {
    console.error('Auth test failed:', error);
  }
}

testAuth();
