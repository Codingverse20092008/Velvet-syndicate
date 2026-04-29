/**
 * Comprehensive Website Testing Suite
 * Tests all frontend pages and backend endpoints
 */

const FRONTEND_URL = 'https://velvet-syndicate.vercel.app';
const BACKEND_URL = 'https://velvet-syndicate.onrender.com';

const testPage = async (path, name) => {
  try {
    const response = await fetch(`${FRONTEND_URL}${path}`);
    const html = await response.text();
    
    const hasContent = html.length > 1000;
    const has404 = html.includes('404: This page could not be found');
    const hasError = html.includes('error') || html.includes('Error');
    
    return {
      path,
      name,
      status: response.status,
      hasContent,
      has404,
      hasError,
      working: response.ok && hasContent && !has404
    };
  } catch (error) {
    return {
      path,
      name,
      status: 'ERROR',
      hasContent: false,
      has404: false,
      hasError: true,
      working: false,
      error: error.message
    };
  }
};

const testAPI = async (endpoint, name) => {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`);
    const data = await response.json();
    
    return {
      endpoint,
      name,
      status: response.status,
      success: data.success,
      working: response.ok && data.success
    };
  } catch (error) {
    return {
      endpoint,
      name,
      status: 'ERROR',
      success: false,
      working: false,
      error: error.message
    };
  }
};

const runComprehensiveTest = async () => {
  console.log('🔍 COMPREHENSIVE WEBSITE TESTING');
  console.log('=' .repeat(50));
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('=' .repeat(50));
  
  // Test all frontend pages
  console.log('\n📱 TESTING FRONTEND PAGES');
  console.log('-' .repeat(50));
  
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/collection', name: 'Collection' },
    { path: '/products', name: 'Products' },
    { path: '/login', name: 'Login' },
    { path: '/signup', name: 'Signup' },
    { path: '/cart', name: 'Cart' },
    { path: '/checkout', name: 'Checkout' },
    { path: '/about', name: 'About' },
    { path: '/profile', name: 'Profile' },
    { path: '/orders', name: 'Orders' },
    { path: '/admin', name: 'Admin' },
    { path: '/admin/products', name: 'Admin Products' },
    { path: '/admin/orders', name: 'Admin Orders' },
    { path: '/admin/analytics', name: 'Admin Analytics' },
  ];
  
  const pageResults = [];
  for (const page of pages) {
    const result = await testPage(page.path, page.name);
    pageResults.push(result);
    console.log(`${result.working ? '✅' : '❌'} ${result.name}: ${result.status}`);
  }
  
  // Test backend API endpoints
  console.log('\n🔌 TESTING BACKEND API');
  console.log('-' .repeat(50));
  
  const apiEndpoints = [
    { endpoint: '/api/health', name: 'Health Check' },
    { endpoint: '/api/products', name: 'Products' },
    { endpoint: '/api/products?limit=6', name: 'Featured Products' },
    { endpoint: '/api/categories', name: 'Categories' },
  ];
  
  const apiResults = [];
  for (const api of apiEndpoints) {
    const result = await testAPI(api.endpoint, api.name);
    apiResults.push(result);
    console.log(`${result.working ? '✅' : '❌'} ${result.name}: ${result.status}`);
  }
  
  // Check specific homepage features
  console.log('\n🎯 TESTING HOMEPAGE FEATURES');
  console.log('-' .repeat(50));
  
  try {
    const homepageResponse = await fetch(FRONTEND_URL);
    const homepageHtml = await homepageResponse.text();
    
    const hasHero3D = homepageHtml.includes('Hero3D') || homepageHtml.includes('3D');
    const hasFeaturedProducts = homepageHtml.includes('Featured Collection') || homepageHtml.includes('products');
    const hasProductsGrid = homepageHtml.includes('product') || homepageHtml.includes('Product');
    const hasImages = homepageHtml.includes('image') || homepageHtml.includes('Image');
    
    console.log(`🎮 3D Hero Section: ${hasHero3D ? '✅' : '❌'}`);
    console.log(`📦 Featured Products Section: ${hasFeaturedProducts ? '✅' : '❌'}`);
    console.log(`🖼️ Product Images: ${hasImages ? '✅' : '❌'}`);
    console.log(`🎴 Products Grid: ${hasProductsGrid ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`❌ Homepage feature test failed: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('-' .repeat(50));
  
  const workingPages = pageResults.filter(r => r.working).length;
  const workingAPIs = apiResults.filter(r => r.working).length;
  
  console.log(`Frontend Pages: ${workingPages}/${pages.length} working`);
  console.log(`Backend APIs: ${workingAPIs}/${apiEndpoints.length} working`);
  
  const failedPages = pageResults.filter(r => !r.working);
  const failedAPIs = apiResults.filter(r => !r.working);
  
  if (failedPages.length > 0) {
    console.log('\n❌ FAILED FRONTEND PAGES:');
    failedPages.forEach(p => console.log(`   - ${p.name}: ${p.status}`));
  }
  
  if (failedAPIs.length > 0) {
    console.log('\n❌ FAILED BACKEND APIs:');
    failedAPIs.forEach(a => console.log(`   - ${a.name}: ${a.status}`));
  }
  
  return {
    pageResults,
    apiResults,
    workingPages,
    workingAPIs,
    failedPages,
    failedAPIs
  };
};

runComprehensiveTest();
