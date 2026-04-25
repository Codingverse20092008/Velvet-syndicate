import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const slowRequestRate = new Rate('slow_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    errors: ['rate<0.05'],             // Less than 5% custom errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Helper to check response
function checkResponse(res, expectedStatus = 200) {
  const success = check(res, {
    'status is correct': (r) => r.status === expectedStatus,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  slowRequestRate.add(res.timings.duration >= 500);

  return success;
}

// Test scenarios
export default function () {
  group('Public API', () => {
    // Test products endpoint
    const productsRes = http.get(`${BASE_URL}/api/v1/products`);
    checkResponse(productsRes);
    sleep(1);

    // Test featured products
    const featuredRes = http.get(`${BASE_URL}/api/v1/products?featured=true`);
    checkResponse(featuredRes);
    sleep(1);

    // Test single product (using a common slug)
    const productRes = http.get(`${BASE_URL}/api/v1/products/obsidian-low`);
    checkResponse(productRes, 200);
    sleep(2);
  });

  group('Auth Endpoints', () => {
    // Simulate login attempts (will fail with 401, that's expected)
    const loginPayload = JSON.stringify({
      email: `test_${Math.random()}@example.com`,
      password: 'testpassword123',
    });

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Expect 401 for invalid credentials
    check(loginRes, {
      'login returns 401 for invalid': (r) => r.status === 401,
    });
    sleep(2);
  });

  group('Cart Operations', () => {
    // These will be rate limited with high concurrency
    const cartPayload = JSON.stringify({
      productId: 'test-product-id',
      size: '9',
      quantity: 1,
    });

    const cartRes = http.post(`${BASE_URL}/api/v1/cart/items`, cartPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Expect 401 without auth
    check(cartRes, {
      'cart requires auth': (r) => r.status === 401,
    });
    sleep(1);
  });

  group('Checkout Flow', () => {
    // Simulate concurrent checkout attempts
    const checkoutPayload = JSON.stringify({
      shippingAddress: '123 Test St, Test City, 12345',
    });

    const checkoutRes = http.post(`${BASE_URL}/api/v1/orders`, checkoutPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Expect 401 without auth
    check(checkoutRes, {
      'checkout requires auth': (r) => r.status === 401,
    });
    sleep(3);
  });

  sleep(1);
}

// Stress test configuration (separate from load test)
export function stressTest() {
  const options = {
    stages: [
      { duration: '2m', target: 500 },  // Ramp up to 500 users
      { duration: '5m', target: 500 },  // Stay at 500 users
      { duration: '2m', target: 1000 }, // Ramp up to 1000 users
      { duration: '5m', target: 1000 }, // Stay at 1000 users
      { duration: '2m', target: 0 },    // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'], // More lenient under stress
      http_req_failed: ['rate<0.05'],
    },
  };

  // Simple health check spam
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health check passes': (r) => r.status === 200,
  });

  sleep(0.1);
}

// Spike test - sudden traffic spike
export function spikeTest() {
  const options = {
    stages: [
      { duration: '10s', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '10s', target: 1000 }, // Spike
      { duration: '3m', target: 1000 },
      { duration: '10s', target: 100 },
      { duration: '3m', target: 100 },
      { duration: '10s', target: 0 },
    ],
  };

  const res = http.get(`${BASE_URL}/api/v1/products`);
  check(res, {
    'products handle spike': (r) => r.status === 200,
  });

  sleep(1);
}

// Soak test - prolonged duration
export function soakTest() {
  const options = {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '4h', target: 100 },
      { duration: '2m', target: 0 },
    ],
  };

  group('Soak Test - Continuous Operations', () => {
    // Mix of read operations
    http.get(`${BASE_URL}/api/v1/products`);
    sleep(Math.random() * 2 + 1);

    http.get(`${BASE_URL}/api/v1/products?featured=true`);
    sleep(Math.random() * 2 + 1);

    if (Math.random() > 0.7) {
      http.get(`${BASE_URL}/api/v1/products/obsidian-low`);
    }
  });
}
