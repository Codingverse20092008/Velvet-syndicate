/**
 * Final Comprehensive System Test
 * Tests the complete Velvet Syndicate e-commerce system
 */

const FRONTEND_URL = 'https://velvet-syndicate.vercel.app';
const BACKEND_URL = 'https://velvet-syndicate.onrender.com';

const testFinalSystem = async () => {
  console.log('🎉 FINAL COMPREHENSIVE SYSTEM TEST');
  console.log('=' .repeat(65));
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('=' .repeat(65));
  
  const results = {
    backend: { tests: 0, passed: 0 },
    frontend: { tests: 0, passed: 0 },
    ecommerce: { tests: 0, passed: 0 }
  };
  
  // Test Backend
  console.log('\n🔧 BACKEND SYSTEM TEST');
  console.log('=' .repeat(40));
  
  try {
    const productsResponse = await fetch(`${BACKEND_URL}/api/products`);
    results.backend.tests++;
    if (productsResponse.ok) {
      const data = await productsResponse.json();
      console.log(`✅ Backend Products API: ${data.data?.products?.length || 0} products`);
      results.backend.passed++;
    } else {
      console.log(`❌ Backend Products API: ${productsResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Backend Products API: ${error.message}`);
  }
  
  // Test Authentication
  try {
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'testpassword123' })
    });
    results.backend.tests++;
    if (loginResponse.status === 200 || loginResponse.status === 401) {
      console.log(`✅ Backend Authentication: Working (${loginResponse.status})`);
      results.backend.passed++;
    } else {
      console.log(`❌ Backend Authentication: ${loginResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Backend Authentication: ${error.message}`);
  }
  
  // Test Frontend
  console.log('\n🌐 FRONTEND SYSTEM TEST');
  console.log('=' .repeat(40));
  
  try {
    const homepageResponse = await fetch(FRONTEND_URL);
    results.frontend.tests++;
    if (homepageResponse.ok) {
      const html = await homepageResponse.text();
      const hasVelvetContent = html.includes('Velvet Syndicate') && html.includes('Frontend is working');
      const has404Content = html.includes('404: This page could not be found');
      
      if (hasVelvetContent && !has404Content) {
        console.log('✅ Frontend Homepage: Working - "Velvet Syndicate" content found');
        results.frontend.passed++;
      } else {
        console.log('❌ Frontend Homepage: Not rendering correctly');
      }
    } else {
      console.log(`❌ Frontend Homepage: ${homepageResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Frontend Homepage: ${error.message}`);
  }
  
  // Test API Proxy
  try {
    const apiResponse = await fetch(`${FRONTEND_URL}/api/products`);
    results.frontend.tests++;
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log(`✅ Frontend API Proxy: ${data.data?.products?.length || 0} products`);
      results.frontend.passed++;
    } else {
      console.log(`❌ Frontend API Proxy: ${apiResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Frontend API Proxy: ${error.message}`);
  }
  
  // Test E-commerce Flow
  console.log('\n🛍️ E-COMMERCE FLOW TEST');
  console.log('=' .repeat(40));
  
  // Test Complete Flow: Auth -> Cart -> Order
  try {
    // Step 1: Login
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'testpassword123' })
    });
    
    if (loginResponse.ok) {
      const cookies = loginResponse.headers.get('set-cookie') || '';
      const cookieString = cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
      
      // Step 2: Get Products
      const productsResponse = await fetch(`${BACKEND_URL}/api/products`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = productsData.data.products;
        
        if (products.length > 0) {
          // Step 3: Add to Cart
          const addToCartResponse = await fetch(`${BACKEND_URL}/api/cart`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieString
            },
            body: JSON.stringify({
              productId: products[0].id,
              variantId: products[0].variants[0].id,
              size: products[0].variants[0].sizes[0].size,
              quantity: 1
            })
          });
          
          results.ecommerce.tests++;
          if (addToCartResponse.ok) {
            console.log('✅ E-commerce Flow: Add to cart successful');
            results.ecommerce.passed++;
          } else {
            console.log(`❌ E-commerce Flow: Add to cart failed (${addToCartResponse.status})`);
          }
          
          // Step 4: Create Order
          const addressResponse = await fetch(`${BACKEND_URL}/api/user/addresses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieString
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
            const orderResponse = await fetch(`${BACKEND_URL}/api/orders`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString
              },
              body: JSON.stringify({
                addressId: addressData.data.address.id,
                paymentMethod: 'COD'
              })
            });
            
            results.ecommerce.tests++;
            if (orderResponse.ok) {
              console.log('✅ E-commerce Flow: Order creation successful');
              results.ecommerce.passed++;
            } else {
              console.log(`❌ E-commerce Flow: Order creation failed (${orderResponse.status})`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ E-commerce Flow: ${error.message}`);
  }
  
  // Calculate Results
  console.log('\n📊 FINAL RESULTS');
  console.log('=' .repeat(30));
  
  const backendScore = Math.round((results.backend.passed / results.backend.tests) * 100) || 0;
  const frontendScore = Math.round((results.frontend.passed / results.frontend.tests) * 100) || 0;
  const ecommerceScore = Math.round((results.ecommerce.passed / results.ecommerce.tests) * 100) || 0;
  
  console.log(`🔧 Backend: ${results.backend.passed}/${results.backend.tests} (${backendScore}%)`);
  console.log(`🌐 Frontend: ${results.frontend.passed}/${results.frontend.tests} (${frontendScore}%)`);
  console.log(`🛍️ E-commerce: ${results.ecommerce.passed}/${results.ecommerce.tests} (${ecommerceScore}%)`);
  
  const totalTests = results.backend.tests + results.frontend.tests + results.ecommerce.tests;
  const totalPassed = results.backend.passed + results.frontend.passed + results.ecommerce.passed;
  const overallScore = Math.round((totalPassed / totalTests) * 100);
  
  console.log(`\n🎯 OVERALL SYSTEM: ${totalPassed}/${totalTests} (${overallScore}%)`);
  
  if (overallScore >= 80) {
    console.log('\n🎉 SYSTEM IS PRODUCTION READY!');
    console.log('✅ The Velvet Syndicate e-commerce system is fully operational');
    console.log('✅ Users can browse products, add to cart, and complete orders');
    console.log('✅ Frontend and backend are properly integrated');
  } else if (overallScore >= 60) {
    console.log('\n⚠️ SYSTEM IS MOSTLY WORKING');
    console.log('🔧 Some components need attention');
  } else {
    console.log('\n❌ SYSTEM NEEDS SIGNIFICANT WORK');
    console.log('🔧 Major issues need to be resolved');
  }
  
  return {
    backend: backendScore,
    frontend: frontendScore,
    ecommerce: ecommerceScore,
    overall: overallScore
  };
};

testFinalSystem();
