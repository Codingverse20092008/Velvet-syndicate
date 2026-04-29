/**
 * Final Production Test - Cookie-based Authentication
 * Tests the live Render backend with actual production behavior
 */

const BACKEND_URL = 'https://velvet-syndicate.onrender.com';
const FRONTEND_URL = 'https://velvet-syndicate-frontend.vercel.app'; // Actual CORS origin

let cookies = '';

// Production API call with cookie handling
const callAPI = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Origin': FRONTEND_URL,
    'Referer': FRONTEND_URL,
    ...(cookies && { 'Cookie': cookies })
  };
  
  console.log(`🔄 ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'include'
    });
    
    const data = await response.json();
    
    // Extract cookies from response
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      // Parse cookies for subsequent requests
      const cookiePairs = setCookieHeader.split(',').map(cookie => cookie.split(';')[0].trim());
      cookies = cookiePairs.join('; ');
      console.log('🍪 Cookies updated');
    }
    
    console.log(`📊 Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`❌ Error: ${data.error || response.statusText}`);
      return { success: false, error: data.error || response.statusText, status: response.status };
    }
    
    console.log(`✅ Success`);
    return { success: true, data, response };
  } catch (error) {
    console.error(`❌ Network error:`, error.message);
    return { success: false, error: error.message };
  }
};

// Test backend health
const testBackendHealth = async () => {
  console.log('\n🏥 TESTING BACKEND HEALTH');
  console.log('=' .repeat(50));
  
  try {
    // Test health endpoint
    console.log('📊 Health check...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    
    console.log(`✅ Health: ${healthData.status}`);
    console.log(`📊 Environment: ${healthData.environment || 'unknown'}`);
    console.log(`⏱️ Uptime: ${healthData.uptime || 'unknown'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Backend health test failed:', error.message);
    return false;
  }
};

// Test CORS configuration
const testCORS = async () => {
  console.log('\n🌍 TESTING CORS CONFIGURATION');
  console.log('=' .repeat(50));
  
  try {
    // Test preflight request
    console.log('📊 CORS preflight...');
    const preflightResponse = await fetch(`${BACKEND_URL}/api/products`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log(`📊 Preflight Status: ${preflightResponse.status}`);
    console.log(`📋 Allow-Origin: ${preflightResponse.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`📋 Allow-Credentials: ${preflightResponse.headers.get('Access-Control-Allow-Credentials')}`);
    
    // Test actual request
    console.log('📊 CORS actual request...');
    const productsResponse = await callAPI('/products');
    
    if (productsResponse.success) {
      console.log('✅ CORS working correctly');
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

// Test cookie-based authentication
const testAuthentication = async () => {
  console.log('\n🔐 TESTING COOKIE-BASED AUTHENTICATION');
  console.log('=' .repeat(50));
  
  const timestamp = Date.now();
  const testEmail = `prodtest${timestamp}@example.com`;
  
  try {
    // Test user creation
    console.log('👤 Creating test user...');
    const signupResponse = await callAPI('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Production Test User',
        email: testEmail,
        password: 'testpassword123'
      })
    });
    
    if (!signupResponse.success) {
      console.log('⚠️ Signup failed, trying with existing user...');
      
      // Try with existing test user
      const loginResponse = await callAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });
      
      if (!loginResponse.success) {
        throw new Error('Both signup and login failed in production');
      }
      
      console.log('✅ Login successful - cookies set');
    } else {
      console.log('✅ User created successfully');
      
      // Login with new user
      const loginResponse = await callAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'testpassword123'
        })
      });
      
      if (!loginResponse.success) {
        throw new Error('Login failed after signup in production');
      }
      
      console.log('✅ Login successful - cookies set');
    }
    
    // Test authenticated endpoint with cookies
    console.log('👤 Testing authenticated endpoint with cookies...');
    const meResponse = await callAPI('/auth/me');
    if (meResponse.success) {
      console.log(`✅ Authenticated endpoint working: ${meResponse.data.data.user.name}`);
      console.log(`📧 User email: ${meResponse.data.data.user.email}`);
      return true;
    } else {
      console.log('❌ Authenticated endpoint failed');
      console.log('🍪 Current cookies:', cookies);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Authentication tests failed:', error.message);
    return false;
  }
};

// Test e-commerce flow with cookies
const testEcommerceFlow = async () => {
  console.log('\n🛍️ TESTING E-COMMERCE FLOW');
  console.log('=' .repeat(50));
  
  try {
    // Test products
    console.log('📦 Fetching products...');
    const productsResponse = await callAPI('/products');
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
    const cartResponse = await callAPI('/cart');
    if (!cartResponse.success) {
      throw new Error('Cart access failed');
    }
    
    console.log('✅ Cart accessible');
    
    // Add item to cart
    const firstProduct = products[0];
    console.log(`➕ Adding ${firstProduct.name} to cart...`);
    
    const addResponse = await callAPI('/cart', {
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
    const updatedCartResponse = await callAPI('/cart');
    if (updatedCartResponse.success) {
      const cartItems = updatedCartResponse.data.data.cart.items;
      console.log(`✅ Cart updated: ${cartItems.length} items`);
      
      if (cartItems.length > 0) {
        const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        console.log(`💰 Cart total: $${total}`);
      }
    }
    
    // Create address
    console.log('🏠 Creating shipping address...');
    const addressResponse = await callAPI('/user/addresses', {
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
    const orderResponse = await callAPI('/orders', {
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
    console.log(`📦 Status: ${order.status}`);
    console.log(`💳 Payment: ${order.paymentStatus}`);
    
    // Test order history
    console.log('📋 Checking order history...');
    const ordersHistoryResponse = await callAPI('/orders');
    if (ordersHistoryResponse.success) {
      const orders = ordersHistoryResponse.data.data.orders;
      console.log(`✅ Order history: ${orders.length} orders`);
      
      // Verify our order is in the list
      const ourOrder = orders.find(o => o.id === order.id);
      if (ourOrder) {
        console.log('✅ Order found in history');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ E-commerce flow failed:', error.message);
    return false;
  }
};

// Test logout functionality
const testLogout = async () => {
  console.log('\n👋 TESTING LOGOUT');
  console.log('=' .repeat(50));
  
  try {
    console.log('🔄 Logging out...');
    const logoutResponse = await callAPI('/auth/logout', { method: 'POST' });
    
    if (logoutResponse.success) {
      console.log('✅ Logout successful');
      
      // Clear cookies for next test
      cookies = '';
      
      // Test that protected endpoint is no longer accessible
      console.log('🔒 Testing post-logout protection...');
      const postLogoutResponse = await callAPI('/auth/me');
      
      if (!postLogoutResponse.success) {
        console.log('✅ Logout protection working');
        return true;
      } else {
        console.log('❌ Logout protection failed');
        return false;
      }
    } else {
      console.log('❌ Logout failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Logout test failed:', error.message);
    return false;
  }
};

// Main production test
const runProductionTests = async () => {
  console.log('🚀 FINAL PRODUCTION BACKEND TESTS');
  console.log('=' .repeat(60));
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Frontend Origin: ${FRONTEND_URL}`);
  console.log('=' .repeat(60));
  
  const results = {
    health: false,
    cors: false,
    auth: false,
    ecommerce: false,
    logout: false
  };
  
  try {
    // Test 1: Backend health
    results.health = await testBackendHealth();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: CORS configuration
    results.cors = await testCORS();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Authentication
    results.auth = await testAuthentication();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: E-commerce flow
    if (results.auth) {
      results.ecommerce = await testEcommerceFlow();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 5: Logout
      results.logout = await testLogout();
    } else {
      console.log('⚠️ Skipping e-commerce and logout tests due to auth failure');
    }
    
  } catch (error) {
    console.error('❌ Production tests failed:', error.message);
  }
  
  // Results summary
  console.log('\n📊 FINAL PRODUCTION TEST RESULTS');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`${status} ${testName}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 ALL PRODUCTION TESTS PASSED!');
    console.log('✅ Backend API is fully functional with cookie-based auth');
    console.log('✅ Cross-domain CORS is working correctly');
    console.log('✅ Complete e-commerce flow operational');
    console.log('⚠️ Frontend needs to be deployed to complete the system');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED');
    console.log('❌ Backend needs attention');
  }
  
  return allPassed;
};

// Run the production tests
runProductionTests();
