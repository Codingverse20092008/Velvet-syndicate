/**
 * Production Environment Test
 * Tests the live Vercel frontend and Render backend
 */

const FRONTEND_URL = 'https://velvet-syndicate.vercel.app';
const BACKEND_URL = 'https://velvet-syndicate.onrender.com';

let accessToken = null;
let testUser = null;

// Production API call function
const callProductionAPI = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Origin': FRONTEND_URL,
    'Referer': FRONTEND_URL,
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  };
  
  console.log(`🔄 ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'include'
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    
    if (!response.ok) {
      return { success: false, error: data.error || response.statusText, status: response.status };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Network error:`, error.message);
    return { success: false, error: error.message };
  }
};

// Test frontend accessibility
const testFrontend = async () => {
  console.log('\n🌐 TESTING FRONTEND ACCESSIBILITY');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(FRONTEND_URL);
    console.log(`📊 Frontend Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Frontend accessible on Vercel');
      return true;
    } else {
      console.log('❌ Frontend not accessible');
      return false;
    }
  } catch (error) {
    console.error('❌ Frontend connection failed:', error.message);
    return false;
  }
};

// Test backend health
const testBackendHealth = async () => {
  console.log('\n🏥 TESTING BACKEND HEALTH');
  console.log('=' .repeat(50));
  
  try {
    // Test health endpoint
    const healthResponse = await callProductionAPI('/health');
    if (healthResponse.success) {
      console.log('✅ Backend health check passed');
      console.log(`📊 Environment: ${healthResponse.data.environment}`);
      console.log(`⏱️ Uptime: ${healthResponse.data.uptime}`);
    } else {
      console.log('❌ Backend health check failed');
      return false;
    }
    
    // Test readiness endpoint
    const readyResponse = await callProductionAPI('/ready');
    if (readyResponse.success) {
      console.log('✅ Backend readiness check passed');
      console.log(`💾 Database: ${readyResponse.data.checks.db.status ? 'Connected' : 'Disconnected'}`);
      console.log(`🔄 Redis: ${readyResponse.data.checks.redis.status ? 'Connected' : 'Disconnected'}`);
      console.log(`⚡ Latency: ${readyResponse.data.totalLatency}`);
    } else {
      console.log('❌ Backend readiness check failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Backend health tests failed:', error.message);
    return false;
  }
};

// Test CORS configuration
const testCORS = async () => {
  console.log('\n🌍 TESTING CORS CONFIGURATION');
  console.log('=' .repeat(50));
  
  try {
    // Test preflight request
    const preflightResponse = await fetch(`${BACKEND_URL}/api/products`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log(`📊 CORS Preflight Status: ${preflightResponse.status}`);
    console.log(`📋 Access-Control-Allow-Origin: ${preflightResponse.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`📋 Access-Control-Allow-Credentials: ${preflightResponse.headers.get('Access-Control-Allow-Credentials')}`);
    
    if (preflightResponse.status === 204 || preflightResponse.status === 200) {
      console.log('✅ CORS preflight successful');
    } else {
      console.log('⚠️ CORS preflight issues detected');
    }
    
    // Test actual request with Origin header
    const actualResponse = await callProductionAPI('/products');
    if (actualResponse.success) {
      console.log('✅ CORS actual request successful');
      return true;
    } else {
      console.log('❌ CORS actual request failed');
      return false;
    }
  } catch (error) {
    console.error('❌ CORS tests failed:', error.message);
    return false;
  }
};

// Test authentication in production
const testAuthentication = async () => {
  console.log('\n🔐 TESTING AUTHENTICATION');
  console.log('=' .repeat(50));
  
  const timestamp = Date.now();
  const testEmail = `prodtest${timestamp}@example.com`;
  
  try {
    // Test user creation
    console.log('👤 Creating test user...');
    const signupResponse = await callProductionAPI('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Production Test User',
        email: testEmail,
        password: 'testpassword123'
      })
    });
    
    if (!signupResponse.success) {
      console.log('⚠️ Signup failed, trying login with existing user...');
      
      // Try with existing test user
      const loginResponse = await callProductionAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });
      
      if (!loginResponse.success) {
        throw new Error('Both signup and login failed in production');
      }
      
      accessToken = loginResponse.data.data.accessToken;
      testUser = loginResponse.data.data.user;
    } else {
      console.log('✅ User created successfully');
      
      // Login with new user
      const loginResponse = await callProductionAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'testpassword123'
        })
      });
      
      if (!loginResponse.success) {
        throw new Error('Login failed after signup in production');
      }
      
      accessToken = loginResponse.data.data.accessToken;
      testUser = loginResponse.data.data.user;
    }
    
    console.log(`✅ Authentication successful: ${testUser.email}`);
    
    // Test authenticated endpoint
    const meResponse = await callProductionAPI('/auth/me');
    if (meResponse.success) {
      console.log('✅ Authenticated endpoint accessible');
      console.log(`👤 User: ${meResponse.data.data.user.name}`);
    } else {
      console.log('❌ Authenticated endpoint failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Authentication tests failed:', error.message);
    return false;
  }
};

// Test e-commerce flow
const testEcommerceFlow = async () => {
  console.log('\n🛍️ TESTING E-COMMERCE FLOW');
  console.log('=' .repeat(50));
  
  try {
    // Test products
    console.log('📦 Fetching products...');
    const productsResponse = await callProductionAPI('/products');
    if (!productsResponse.success) {
      throw new Error('Products fetch failed');
    }
    
    const products = productsResponse.data.data.products;
    console.log(`✅ Found ${products.length} products`);
    
    if (products.length === 0) {
      throw new Error('No products available');
    }
    
    // Test cart access
    console.log('🛒 Testing cart access...');
    const cartResponse = await callProductionAPI('/cart');
    if (!cartResponse.success) {
      throw new Error('Cart access failed');
    }
    
    console.log('✅ Cart accessible');
    
    // Add item to cart
    const firstProduct = products[0];
    console.log(`➕ Adding ${firstProduct.name} to cart...`);
    
    const addResponse = await callProductionAPI('/cart', {
      method: 'POST',
      body: JSON.stringify({
        productId: firstProduct.id,
        variantId: firstProduct.variants?.[0]?.id || 'default',
        size: 'M',
        quantity: 1
      })
    });
    
    if (!addResponse.success) {
      throw new Error('Add to cart failed');
    }
    
    console.log('✅ Item added to cart');
    
    // Check updated cart
    const updatedCartResponse = await callProductionAPI('/cart');
    if (updatedCartResponse.success) {
      const cartItems = updatedCartResponse.data.data.cart.items;
      console.log(`✅ Cart updated: ${cartItems.length} items`);
    }
    
    // Create address
    console.log('🏠 Creating shipping address...');
    const addressResponse = await callProductionAPI('/user/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Production Test User',
        phone: '+1234567890',
        street: '123 Production Street',
        city: 'Test City',
        state: 'TS',
        pincode: '12345',
        isDefault: true
      })
    });
    
    if (!addressResponse.success) {
      throw new Error('Address creation failed');
    }
    
    console.log('✅ Address created');
    
    // Create order
    console.log('📦 Creating order...');
    const orderResponse = await callProductionAPI('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{
          productId: firstProduct.id,
          variantId: firstProduct.variants?.[0]?.id || 'default',
          quantity: 1,
          size: 'M'
        }],
        shippingAddress: addressResponse.data.data.address,
        paymentMethod: 'COD',
        totalAmount: firstProduct.price
      })
    });
    
    if (!orderResponse.success) {
      throw new Error('Order creation failed');
    }
    
    const order = orderResponse.data.data.order;
    console.log(`✅ Order created: ${order.id}`);
    console.log(`💰 Total: $${order.totalAmount}`);
    
    // Test order history
    console.log('📋 Checking order history...');
    const ordersHistoryResponse = await callProductionAPI('/orders');
    if (ordersHistoryResponse.success) {
      const orders = ordersHistoryResponse.data.data.orders;
      console.log(`✅ Order history: ${orders.length} orders`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ E-commerce flow failed:', error.message);
    return false;
  }
};

// Main production test
const runProductionTests = async () => {
  console.log('🚀 STARTING PRODUCTION ENVIRONMENT TESTS');
  console.log('=' .repeat(60));
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('=' .repeat(60));
  
  const results = {
    frontend: false,
    backend: false,
    cors: false,
    auth: false,
    ecommerce: false
  };
  
  try {
    // Test 1: Frontend accessibility
    results.frontend = await testFrontend();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Backend health
    results.backend = await testBackendHealth();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: CORS configuration
    results.cors = await testCORS();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Authentication
    results.auth = await testAuthentication();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 5: E-commerce flow
    results.ecommerce = await testEcommerceFlow();
    
  } catch (error) {
    console.error('❌ Production tests failed:', error.message);
  }
  
  // Results summary
  console.log('\n📊 PRODUCTION TEST RESULTS');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`${status} ${testName}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 ALL PRODUCTION TESTS PASSED!');
    console.log('✅ System is fully functional in production');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED');
    console.log('❌ System needs attention in production');
  }
  
  return allPassed;
};

// Run the production tests
runProductionTests();
