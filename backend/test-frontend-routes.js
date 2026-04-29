/**
 * Test Actual Frontend Routes
 * Tests the correct routes that exist in the frontend
 */

const FRONTEND_URL = 'https://velvet-syndicate-frontend.vercel.app';

const testRoute = async (path, description) => {
  console.log(`\n📄 Testing: ${description} (${path})`);
  
  try {
    const response = await fetch(`${FRONTEND_URL}${path}`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      const has404Content = html.includes('404: This page could not be found');
      const hasNextData = html.includes('__NEXT_DATA__');
      const hasMainContent = html.includes('<main') || html.includes('main');
      
      console.log(`📄 Has 404 content: ${has404Content}`);
      console.log(`📄 Has Next.js data: ${hasNextData}`);
      console.log(`📄 Has main content: ${hasMainContent}`);
      
      if (has404Content) {
        console.log('❌ Page shows 404 error');
        return false;
      } else {
        console.log('✅ Page loads successfully');
        return true;
      }
    } else {
      console.log('❌ Page failed to load');
      return false;
    }
  } catch (error) {
    console.error('❌ Route test error:', error.message);
    return false;
  }
};

const testActualRoutes = async () => {
  console.log('🗺️ TESTING ACTUAL FRONTEND ROUTES');
  console.log('=' .repeat(60));
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log('=' .repeat(60));
  
  // Test the actual routes that exist
  const routes = [
    { path: '/', description: 'Homepage' },
    { path: '/login', description: 'Login Page' },
    { path: '/signup', description: 'Signup Page' },
    { path: '/about', description: 'About Page' },
    { path: '/collection', description: 'Collection Page' },
    { path: '/orders', description: 'Orders Page' },
    { path: '/profile', description: 'Profile Page' },
    { path: '/addresses', description: 'Addresses Page' },
    { path: '/checkout', description: 'Checkout Page' },
    { path: '/order-success', description: 'Order Success Page' },
    { path: '/order-secure', description: 'Order Secure Page' }
  ];
  
  let workingRoutes = 0;
  const results = {};
  
  for (const route of routes) {
    const isWorking = await testRoute(route.path, route.description);
    results[route.path] = isWorking;
    if (isWorking) workingRoutes++;
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test dynamic routes
  console.log('\n🔗 TESTING DYNAMIC ROUTES');
  console.log('=' .repeat(30));
  
  // Test product detail page (using a sample slug)
  const productWorking = await testRoute('/product/test-product', 'Product Detail Page');
  results['/product/:slug'] = productWorking;
  if (productWorking) workingRoutes++;
  
  // Test order detail page
  const orderDetailWorking = await testRoute('/orders/test-order-id', 'Order Detail Page');
  results['/orders/:id'] = orderDetailWorking;
  if (orderDetailWorking) workingRoutes++;
  
  // Results summary
  console.log('\n📊 FRONTEND ROUTES TEST RESULTS');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([route, working]) => {
    const status = working ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${route}`);
  });
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Working Routes: ${workingRoutes}/${Object.keys(results).length}`);
  console.log(`   Success Rate: ${Math.round((workingRoutes / Object.keys(results).length) * 100)}%`);
  
  if (workingRoutes >= Object.keys(results).length * 0.7) {
    console.log('\n🎉 FRONTEND ROUTES ARE MOSTLY WORKING!');
    console.log('✅ Core functionality is accessible');
    console.log('⚠️ Some routes may need attention');
    return true;
  } else {
    console.log('\n⚠️ FRONTEND ROUTES NEED SIGNIFICANT ATTENTION');
    console.log('❌ Most routes are not working properly');
    return false;
  }
};

// Test the actual routes
testActualRoutes();
