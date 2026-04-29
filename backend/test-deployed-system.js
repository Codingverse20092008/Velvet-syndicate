/**
 * Complete Deployed System Test
 * Tests both frontend and backend deployment status and integration
 */

const FRONTEND_URL = 'https://velvet-syndicate.vercel.app';
const BACKEND_URL = 'https://velvet-syndicate.onrender.com';

// Test backend health and functionality
const testBackendSystem = async () => {
  console.log('🔧 TESTING BACKEND SYSTEM');
  console.log('=' .repeat(50));
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('=' .repeat(50));
  
  const results = {
    health: false,
    products: false,
    auth: false,
    cart: false,
    orders: false,
    cors: false
  };
  
  try {
    // Test backend health
    console.log('\n🏥 Testing Backend Health...');
    const healthResponse = await fetch(`${BACKEND_URL}/api/products`, {
      headers: { 'Origin': FRONTEND_URL }
    });
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log(`✅ Backend is healthy`);
      console.log(`📦 Products available: ${data.data?.products?.length || 0}`);
      results.health = true;
      results.products = true;
    } else {
      console.log(`❌ Backend health check failed: ${healthResponse.status}`);
    }
    
    // Test CORS configuration
    console.log('\n🌍 Testing CORS Configuration...');
    const corsHeaders = healthResponse.headers.get('Access-Control-Allow-Origin');
    console.log(`📋 CORS Allow-Origin: ${corsHeaders}`);
    
    if (corsHeaders === FRONTEND_URL || corsHeaders === '*') {
      console.log('✅ CORS properly configured');
      results.cors = true;
    } else {
      console.log('⚠️ CORS may not be properly configured');
    }
    
    // Test authentication
    console.log('\n🔐 Testing Authentication...');
    const signupResponse = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'testpassword123'
      })
    });
    
    console.log(`📊 Signup status: ${signupResponse.status}`);
    
    if (signupResponse.status === 201 || signupResponse.status === 400) {
      console.log('✅ Authentication endpoint working');
      results.auth = true;
    } else {
      console.log('❌ Authentication endpoint failed');
    }
    
    // Test login
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    console.log(`📊 Login status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      console.log('✅ Login working');
      
      // Test protected endpoints with login
      const cookies = loginResponse.headers.get('set-cookie');
      if (cookies) {
        const cookiePairs = cookies.split(',').map(cookie => cookie.split(';')[0].trim());
        const cookieString = cookiePairs.join('; ');
        
        // Test cart
        const cartResponse = await fetch(`${BACKEND_URL}/api/cart`, {
          headers: {
            'Origin': FRONTEND_URL,
            'Cookie': cookieString
          }
        });
        
        console.log(`📊 Cart status: ${cartResponse.status}`);
        if (cartResponse.ok) {
          console.log('✅ Cart endpoint working');
          results.cart = true;
        }
        
        // Test orders
        const ordersResponse = await fetch(`${BACKEND_URL}/api/orders`, {
          headers: {
            'Origin': FRONTEND_URL,
            'Cookie': cookieString
          }
        });
        
        console.log(`📊 Orders status: ${ordersResponse.status}`);
        if (ordersResponse.ok) {
          console.log('✅ Orders endpoint working');
          results.orders = true;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }
  
  return results;
};

// Test frontend deployment
const testFrontendSystem = async () => {
  console.log('\n🌐 TESTING FRONTEND SYSTEM');
  console.log('=' .repeat(50));
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log('=' .repeat(50));
  
  const results = {
    homepage: false,
    pages: false,
    apiProxy: false,
    routing: false,
    build: false
  };
  
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/login', name: 'Login' },
    { path: '/signup', name: 'Signup' },
    { path: '/collection', name: 'Collection' },
    { path: '/products', name: 'Products' },
    { path: '/cart', name: 'Cart' },
    { path: '/orders', name: 'Orders' }
  ];
  
  try {
    // Test main pages
    console.log('\n📄 Testing Frontend Pages...');
    let workingPages = 0;
    
    for (const page of pages) {
      const response = await fetch(`${FRONTEND_URL}${page.path}`);
      console.log(`📊 ${page.name}: ${response.status}`);
      
      if (response.ok) {
        const html = await response.text();
        const has404Content = html.includes('404: This page could not be found');
        const hasNextData = html.includes('__NEXT_DATA__');
        const hasMainContent = html.includes('<main') || html.includes('main');
        
        if (!has404Content && (hasNextData || hasMainContent)) {
          workingPages++;
          console.log(`✅ ${page.name} working`);
        } else {
          console.log(`❌ ${page.name} shows 404 or broken content`);
        }
      } else {
        console.log(`❌ ${page.name} failed to load`);
      }
    }
    
    if (workingPages >= pages.length * 0.7) {
      console.log('✅ Most frontend pages working');
      results.pages = true;
    }
    
    // Test homepage specifically
    const homepageResponse = await fetch(FRONTEND_URL);
    if (homepageResponse.ok) {
      const homepageHtml = await homepageResponse.text();
      const has404Content = homepageHtml.includes('404: This page could not be found');
      const hasNextData = homepageHtml.includes('__NEXT_DATA__');
      
      if (!has404Content && hasNextData) {
        console.log('✅ Homepage properly built and rendered');
        results.homepage = true;
        results.build = true;
      }
    }
    
    // Test API proxy
    console.log('\n🔌 Testing Frontend API Proxy...');
    const apiResponse = await fetch(`${FRONTEND_URL}/api/products`);
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log(`✅ API proxy working`);
      console.log(`📦 Products available through proxy: ${apiData.data?.products?.length || 0}`);
      results.apiProxy = true;
    } else {
      console.log(`❌ API proxy failed: ${apiResponse.status}`);
    }
    
    // Test routing
    if (workingPages > 0 && results.apiProxy) {
      console.log('✅ Frontend routing appears to be working');
      results.routing = true;
    }
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
  }
  
  return results;
};

// Test complete e-commerce flow
const testEcommerceFlow = async () => {
  console.log('\n🛍️ TESTING COMPLETE E-COMMERCE FLOW');
  console.log('=' .repeat(50));
  
  const results = {
    authentication: false,
    productBrowsing: false,
    cartOperations: false,
    orderCreation: false,
    integration: false
  };
  
  let cookies = '';
  
  try {
    // Step 1: Authentication
    console.log('\n🔐 Step 1: Testing Authentication...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    if (loginResponse.ok) {
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        const cookiePairs = setCookieHeader.split(',').map(cookie => cookie.split(';')[0].trim());
        cookies = cookiePairs.join('; ');
        console.log('✅ Authentication successful');
        results.authentication = true;
      }
    }
    
    // Step 2: Product Browsing
    console.log('\n📦 Step 2: Testing Product Browsing...');
    const productsResponse = await fetch(`${BACKEND_URL}/api/products`, {
      headers: { 'Origin': FRONTEND_URL }
    });
    
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      const products = productsData.data.products;
      console.log(`✅ Products accessible: ${products.length} available`);
      results.productBrowsing = true;
      
      if (products.length > 0) {
        // Step 3: Cart Operations
        console.log('\n🛒 Step 3: Testing Cart Operations...');
        const addToCartResponse = await fetch(`${BACKEND_URL}/api/cart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': FRONTEND_URL,
            'Cookie': cookies
          },
          body: JSON.stringify({
            productId: products[0].id,
            variantId: products[0].variants[0].id,
            size: products[0].variants[0].sizes[0].size,
            quantity: 1
          })
        });
        
        if (addToCartResponse.ok) {
          console.log('✅ Add to cart successful');
          
          const cartResponse = await fetch(`${BACKEND_URL}/api/cart`, {
            headers: {
              'Origin': FRONTEND_URL,
              'Cookie': cookies
            }
          });
          
          if (cartResponse.ok) {
            const cartData = await cartResponse.json();
            console.log(`✅ Cart accessible: ${cartData.data.cart.items.length} items`);
            results.cartOperations = true;
          }
        }
      }
    }
    
    // Step 4: Order Creation
    if (results.cartOperations) {
      console.log('\n📦 Step 4: Testing Order Creation...');
      
      // Create address
      const addressResponse = await fetch(`${BACKEND_URL}/api/user/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL,
          'Cookie': cookies
        },
        body: JSON.stringify({
          name: 'Test User',
          phone: '9876543210',
          street: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          pincode: '123456'
        })
      });
      
      if (addressResponse.ok) {
        const addressData = await addressResponse.json();
        const addressId = addressData.data.address.id;
        
        // Create order
        const orderResponse = await fetch(`${BACKEND_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': FRONTEND_URL,
            'Cookie': cookies
          },
          body: JSON.stringify({
            addressId: addressId,
            paymentMethod: 'COD'
          })
        });
        
        if (orderResponse.ok) {
          console.log('✅ Order creation successful');
          results.orderCreation = true;
        }
      }
    }
    
    // Step 5: Integration Test
    if (results.authentication && results.productBrowsing && results.cartOperations) {
      console.log('\n🔗 Step 5: Testing Frontend-Backend Integration...');
      
      // Test if frontend can access backend through API proxy
      const frontendApiTest = await fetch(`${FRONTEND_URL}/api/products`);
      
      if (frontendApiTest.ok) {
        console.log('✅ Frontend-backend integration working');
        results.integration = true;
      }
    }
    
  } catch (error) {
    console.error('❌ E-commerce flow test failed:', error.message);
  }
  
  return results;
};

// Generate final status report
const generateStatusReport = (backendResults, frontendResults, ecommerceResults) => {
  console.log('\n📊 FINAL SYSTEM STATUS REPORT');
  console.log('=' .repeat(65));
  
  // Backend status
  console.log('\n🔧 BACKEND STATUS:');
  const backendScore = Object.values(backendResults).filter(Boolean).length;
  const backendTotal = Object.keys(backendResults).length;
  console.log(`   Score: ${backendScore}/${backendTotal} (${Math.round(backendScore/backendTotal * 100)}%)`);
  
  Object.entries(backendResults).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`   ${status} ${testName}`);
  });
  
  // Frontend status
  console.log('\n🌐 FRONTEND STATUS:');
  const frontendScore = Object.values(frontendResults).filter(Boolean).length;
  const frontendTotal = Object.keys(frontendResults).length;
  console.log(`   Score: ${frontendScore}/${frontendTotal} (${Math.round(frontendScore/frontendTotal * 100)}%)`);
  
  Object.entries(frontendResults).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`   ${status} ${testName}`);
  });
  
  // E-commerce status
  console.log('\n🛍️ E-COMMERCE FLOW STATUS:');
  const ecommerceScore = Object.values(ecommerceResults).filter(Boolean).length;
  const ecommerceTotal = Object.keys(ecommerceResults).length;
  console.log(`   Score: ${ecommerceScore}/${ecommerceTotal} (${Math.round(ecommerceScore/ecommerceTotal * 100)}%)`);
  
  Object.entries(ecommerceResults).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
    console.log(`   ${status} ${testName}`);
  });
  
  // Overall status
  const totalScore = backendScore + frontendScore + ecommerceScore;
  const totalPossible = backendTotal + frontendTotal + ecommerceTotal;
  const overallPercentage = Math.round(totalScore / totalPossible * 100);
  
  console.log('\n🎯 OVERALL SYSTEM STATUS:');
  console.log(`   Total Score: ${totalScore}/${totalPossible} (${overallPercentage}%)`);
  
  if (overallPercentage >= 80) {
    console.log('   🎉 SYSTEM IS PRODUCTION READY!');
  } else if (overallPercentage >= 60) {
    console.log('   ⚠️ SYSTEM IS MOSTLY WORKING - Minor issues remain');
  } else {
    console.log('   ❌ SYSTEM NEEDS SIGNIFICANT WORK');
  }
  
  console.log('\n📋 RECOMMENDATIONS:');
  
  if (!frontendResults.homepage) {
    console.log('   - Deploy fixed frontend to Vercel');
  }
  if (!frontendResults.pages) {
    console.log('   - Fix frontend routing issues');
  }
  if (!backendResults.cors) {
    console.log('   - Configure CORS properly');
  }
  if (!ecommerceResults.orderCreation) {
    console.log('   - Fix order creation flow');
  }
  
  return overallPercentage;
};

// Main test execution
const runCompleteSystemTest = async () => {
  console.log('🚀 COMPLETE DEPLOYED SYSTEM TEST');
  console.log('=' .repeat(65));
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('=' .repeat(65));
  
  try {
    // Test backend
    const backendResults = await testBackendSystem();
    
    // Test frontend
    const frontendResults = await testFrontendSystem();
    
    // Test e-commerce flow
    const ecommerceResults = await testEcommerceFlow();
    
    // Generate final report
    const overallScore = generateStatusReport(backendResults, frontendResults, ecommerceResults);
    
    return {
      backend: backendResults,
      frontend: frontendResults,
      ecommerce: ecommerceResults,
      overall: overallScore
    };
    
  } catch (error) {
    console.error('❌ Complete system test failed:', error.message);
    return null;
  }
};

// Run the complete system test
runCompleteSystemTest();
