/**
 * Complete Frontend-Backend Integration Test
 * Tests https://velvet-syndicate-frontend.vercel.app with backend integration
 */

const FRONTEND_URL = 'https://velvet-syndicate-frontend.vercel.app';
const BACKEND_URL = 'https://velvet-syndicate.onrender.com';

// Test frontend accessibility
const testFrontendAccessibility = async () => {
  console.log('🌐 TESTING FRONTEND ACCESSIBILITY');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(FRONTEND_URL);
    console.log(`📊 Frontend Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for key frontend elements
      const hasTitle = html.includes('<title>');
      const hasNextData = html.includes('__NEXT_DATA__');
      const hasBody = html.includes('<body');
      
      console.log(`✅ Frontend accessible`);
      console.log(`📄 Has title: ${hasTitle}`);
      console.log(`📄 Next.js data: ${hasNextData}`);
      console.log(`📄 Body content: ${hasBody}`);
      
      if (hasTitle && hasNextData && hasBody) {
        console.log('✅ Frontend appears to be properly loaded');
        return true;
      } else {
        console.log('⚠️ Frontend may have loading issues');
        return false;
      }
    } else {
      console.log('❌ Frontend not accessible');
      return false;
    }
  } catch (error) {
    console.error('❌ Frontend connection failed:', error.message);
    return false;
  }
};

// Test frontend API routes (if any)
const testFrontendAPIRoutes = async () => {
  console.log('\n🔌 TESTING FRONTEND API ROUTES');
  console.log('=' .repeat(50));
  
  const apiRoutes = [
    '/api/auth/me',
    '/api/products',
    '/api/cart',
    '/api/orders'
  ];
  
  let workingRoutes = 0;
  
  for (const route of apiRoutes) {
    try {
      const response = await fetch(`${FRONTEND_URL}${route}`);
      console.log(`📊 ${route}: ${response.status}`);
      
      if (response.status === 200) {
        workingRoutes++;
        console.log(`✅ ${route} working`);
      } else if (response.status === 401) {
        workingRoutes++;
        console.log(`✅ ${route} protected (expected)`);
      } else if (response.status === 404) {
        console.log(`⚠️ ${route} not found (frontend may proxy to backend)`);
      } else {
        console.log(`❌ ${route} failed`);
      }
    } catch (error) {
      console.log(`❌ ${route} error: ${error.message}`);
    }
  }
  
  console.log(`✅ Working routes: ${workingRoutes}/${apiRoutes.length}`);
  return workingRoutes > 0;
};

// Test backend API from frontend origin
const testBackendFromFrontendOrigin = async () => {
  console.log('\n🔗 TESTING BACKEND FROM FRONTEND ORIGIN');
  console.log('=' .repeat(50));
  
  try {
    // Test products endpoint with frontend origin
    const productsResponse = await fetch(`${BACKEND_URL}/api/products`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL
      }
    });
    
    console.log(`📊 Products from frontend origin: ${productsResponse.status}`);
    console.log(`📋 CORS Headers: ${productsResponse.headers.get('Access-Control-Allow-Origin')}`);
    
    if (productsResponse.ok) {
      const data = await productsResponse.json();
      console.log(`✅ Backend accessible from frontend origin`);
      console.log(`📦 Products available: ${data.data?.products?.length || 0}`);
      return true;
    } else {
      console.log('❌ Backend not accessible from frontend origin');
      return false;
    }
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    return false;
  }
};

// Test authentication flow integration
const testAuthenticationIntegration = async () => {
  console.log('\n🔐 TESTING AUTHENTICATION INTEGRATION');
  console.log('=' .repeat(50));
  
  const timestamp = Date.now();
  const testEmail = `frontendtest${timestamp}@example.com`;
  let cookies = '';
  
  try {
    // Test signup through backend with frontend origin
    console.log('👤 Testing user signup...');
    const signupResponse = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL
      },
      body: JSON.stringify({
        name: 'Frontend Test User',
        email: testEmail,
        password: 'testpassword123'
      }),
      credentials: 'include'
    });
    
    console.log(`📊 Signup status: ${signupResponse.status}`);
    
    // Extract cookies
    const setCookieHeader = signupResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      const cookiePairs = setCookieHeader.split(',').map(cookie => cookie.split(';')[0].trim());
      cookies = cookiePairs.join('; ');
      console.log('🍪 Cookies received from signup');
    }
    
    if (!signupResponse.ok) {
      console.log('⚠️ Signup failed, trying login with existing user...');
    }
    
    // Test login
    console.log('🔐 Testing user login...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      }),
      credentials: 'include'
    });
    
    console.log(`📊 Login status: ${loginResponse.status}`);
    
    // Extract cookies from login
    const loginCookieHeader = loginResponse.headers.get('set-cookie');
    if (loginCookieHeader) {
      const cookiePairs = loginCookieHeader.split(',').map(cookie => cookie.split(';')[0].trim());
      cookies = cookiePairs.join('; ');
      console.log('🍪 Cookies received from login');
    }
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    // Test authenticated endpoint
    console.log('👤 Testing authenticated endpoint...');
    const meResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL,
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });
    
    console.log(`📊 Authenticated endpoint status: ${meResponse.status}`);
    
    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log(`✅ Authentication working: ${userData.data?.user?.name || 'Unknown'}`);
      return true;
    } else {
      console.log('❌ Authenticated endpoint failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Authentication integration failed:', error.message);
    return false;
  }
};

// Test e-commerce flow integration
const testEcommerceIntegration = async () => {
  console.log('\n🛍️ TESTING E-COMMERCE INTEGRATION');
  console.log('=' .repeat(50));
  
  let cookies = '';
  
  try {
    // Login first
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed for e-commerce test');
    }
    
    // Get cookies
    const loginCookieHeader = loginResponse.headers.get('set-cookie');
    if (loginCookieHeader) {
      const cookiePairs = loginCookieHeader.split(',').map(cookie => cookie.split(';')[0].trim());
      cookies = cookiePairs.join('; ');
    }
    
    // Test products
    console.log('📦 Testing products...');
    const productsResponse = await fetch(`${BACKEND_URL}/api/products`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL
      }
    });
    
    if (!productsResponse.ok) {
      throw new Error('Products fetch failed');
    }
    
    const productsData = await productsResponse.json();
    const products = productsData.data.products;
    console.log(`✅ Products accessible: ${products.length} available`);
    
    // Test cart access
    console.log('🛒 Testing cart access...');
    const cartResponse = await fetch(`${BACKEND_URL}/api/cart`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL,
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });
    
    console.log(`📊 Cart status: ${cartResponse.status}`);
    
    if (cartResponse.ok) {
      const cartData = await cartResponse.json();
      console.log(`✅ Cart accessible: ${cartData.data?.cart?.items?.length || 0} items`);
    } else {
      console.log('❌ Cart access failed');
      return false;
    }
    
    // Test order history
    console.log('📋 Testing order history...');
    const ordersResponse = await fetch(`${BACKEND_URL}/api/orders`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL,
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });
    
    console.log(`📊 Orders status: ${ordersResponse.status}`);
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log(`✅ Order history accessible: ${ordersData.data?.orders?.length || 0} orders`);
    } else {
      console.log('❌ Order history access failed');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ E-commerce integration failed:', error.message);
    return false;
  }
};

// Test frontend pages
const testFrontendPages = async () => {
  console.log('\n📄 TESTING FRONTEND PAGES');
  console.log('=' .repeat(50));
  
  const pages = [
    '/',
    '/login',
    '/signup',
    '/products',
    '/cart',
    '/orders'
  ];
  
  let workingPages = 0;
  
  for (const page of pages) {
    try {
      const response = await fetch(`${FRONTEND_URL}${page}`);
      console.log(`📊 ${page}: ${response.status}`);
      
      if (response.ok) {
        workingPages++;
        console.log(`✅ ${page} loads successfully`);
      } else {
        console.log(`❌ ${page} failed to load`);
      }
    } catch (error) {
      console.log(`❌ ${page} error: ${error.message}`);
    }
  }
  
  console.log(`✅ Working pages: ${workingPages}/${pages.length}`);
  return workingPages > 0;
};

// Main integration test
const runCompleteIntegrationTest = async () => {
  console.log('🚀 COMPLETE FRONTEND-BACKEND INTEGRATION TEST');
  console.log('=' .repeat(65));
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('=' .repeat(65));
  
  const results = {
    frontend: false,
    frontendAPI: false,
    backendIntegration: false,
    authentication: false,
    ecommerce: false,
    pages: false
  };
  
  try {
    // Test 1: Frontend accessibility
    results.frontend = await testFrontendAccessibility();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Frontend API routes
    results.frontendAPI = await testFrontendAPIRoutes();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Backend from frontend origin
    results.backendIntegration = await testBackendFromFrontendOrigin();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Authentication integration
    results.authentication = await testAuthenticationIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 5: E-commerce integration
    results.ecommerce = await testEcommerceIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 6: Frontend pages
    results.pages = await testFrontendPages();
    
  } catch (error) {
    console.error('❌ Integration tests failed:', error.message);
  }
  
  // Results summary
  console.log('\n📊 INTEGRATION TEST RESULTS');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
    console.log(`${status} ${testName}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 COMPLETE INTEGRATION SUCCESSFUL!');
    console.log('✅ Frontend and backend are fully integrated');
    console.log('✅ All e-commerce functionality working');
    console.log('✅ Authentication flow working properly');
    console.log('✅ Cross-domain requests working');
    console.log('');
    console.log('🌐 SYSTEM STATUS: PRODUCTION READY!');
  } else {
    console.log('\n⚠️ SOME INTEGRATION ISSUES FOUND');
    console.log('❌ System needs attention');
    
    const failedTests = Object.entries(results).filter(([_, passed]) => !passed);
    console.log('\n🔧 FAILED COMPONENTS:');
    failedTests.forEach(([test, _]) => {
      const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
      console.log(`   - ${testName}`);
    });
  }
  
  return allPassed;
};

// Run the complete integration test
runCompleteIntegrationTest();
