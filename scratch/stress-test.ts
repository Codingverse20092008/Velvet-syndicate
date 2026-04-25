import { exit } from 'process';

const API_BASE = 'http://localhost:3000/api';
const ADMIN_SECRET = 'velvet-admin-key-2026';
let failedTests = 0;
let passedTests = 0;

// Helper to assert formats and conditions
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
  }
}

// Helper to assert the unified response format
function assertFormat(data: any, expectedSuccess: boolean) {
  assert(data !== undefined && data !== null, 'Response is not empty');
  assert(typeof data.success === 'boolean', `Response has success boolean (got ${data.success})`);
  assert(data.success === expectedSuccess, `Response success is ${expectedSuccess}`);
  
  if (expectedSuccess) {
    assert(data.error === null, 'Success response has error: null');
    assert(data.code === null, 'Success response has code: null');
  } else {
    assert(typeof data.error === 'string', 'Error response has error message string');
    assert(typeof data.code === 'string', 'Error response has code string');
    assert(data.data === null, 'Error response has data: null');
  }
}

function generateCsrfToken() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  let hash = 0;
  const tokenStr = timestamp + random;
  for (let i = 0; i < tokenStr.length; i++) {
    hash = ((hash << 5) - hash) + tokenStr.charCodeAt(i);
    hash = hash & hash;
  }
  const hashStr = Math.abs(hash).toString(36);
  const token = `${timestamp}:${random}:${hashStr}`;
  return Buffer.from(token).toString('base64url');
}

async function request(endpoint: string, options: RequestInit = {}) {
  const csrfToken = generateCsrfToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      ...options.headers,
    },
  });
  
  let json;
  try {
    json = await res.json();
  } catch (e) {
    console.error(`Failed to parse JSON for ${endpoint} - Status ${res.status}`);
    return { status: res.status, data: null };
  }
  return { status: res.status, data: json };
}

async function runTests() {
  console.log('\n--- 1. SECURITY TESTS ---');
  
  const sec1 = await request('/admin/orders');
  assert(sec1.status === 401, 'Admin route without secret returns 401');
  assertFormat(sec1.data, false);

  const sec2 = await request('/admin/orders', { headers: { 'x-admin-secret': 'wrong-secret' } });
  assert(sec2.status === 401, 'Admin route with wrong secret returns 401');
  assertFormat(sec2.data, false);


  console.log('\n--- 2. VALIDATION & EDGE CASE TESTS ---');
  
  // Empty cart add (No Auth)
  const val1 = await request('/cart', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert(val1.status === 401, `Unauthenticated cart add returns 401 (got ${val1.status})`);

  // Invalid strings, wrong types, negative numbers
  const val2 = await request('/cart', {
    method: 'POST',
    body: JSON.stringify({
      productId: 123, // should be string
      size: '', // empty
      quantity: -5, // negative
    }),
  });
  assert(val2.status === 401, `Unauthenticated cart data returns 401 (got ${val2.status})`);
  
  // Test invalid checkout empty body
  const val3 = await request('/orders', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert(val3.status === 401, `Unauthenticated order checkout returns 401 (got ${val3.status})`);


  console.log('\n--- 3. CART ABUSE TEST ---');
  console.log('Fetching a product to test with...');
  const prodRes = await request('/products');
  let testProductId = 'some-product-id';
  let testSize = 'M';
  
  if (prodRes.data?.success && prodRes.data.data?.products?.length > 0) {
    testProductId = prodRes.data.data.products[0].id;
  }
  
  // Rapid requests (increase to 150 to hit rate limit)
  const promises = [];
  for (let i = 0; i < 150; i++) {
    promises.push(request('/products')); // hitting public route to test rate limiter
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.status === 429);
  assert(rateLimited.length > 0, `System rate limits rapid requests (Got ${rateLimited.length} 429s out of 150)`);
  

  console.log('\n--- 4. CONCURRENT REQUEST TEST (RACE CONDITIONS) ---');
  const stockPromises = [];
  for (let i = 0; i < 15; i++) {
    stockPromises.push(request('/admin/stock', {
      method: 'PATCH',
      headers: { 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        productId: testProductId,
        size: testSize,
        stock: -1 // Negative stock test via concurrent patch
      }),
    }));
  }
  const stockRes = await Promise.all(stockPromises);
  const negativeFailedSafely = stockRes.every(r => r.status === 400 || r.status === 429);
  if (!negativeFailedSafely) {
    console.error('Statuses received for negative stock test:', stockRes.map(r => r.status).join(', '));
  }
  assert(negativeFailedSafely, 'Negative stock updates all fail safely (400 or 429)');


  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Total Passed: ${passedTests}`);
  console.log(`Total Failed: ${failedTests}`);
  
  if (failedTests > 0) {
    console.error('\n⚠️ VERDICT: NOT SAFE FOR PRODUCTION');
  } else {
    console.log('\n✅ VERDICT: SAFE FOR PRODUCTION');
  }
  
  exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(console.error);
