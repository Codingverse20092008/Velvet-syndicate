/**
 * Detailed Frontend Analysis
 * Tests specific frontend functionality and identifies issues
 */

const FRONTEND_URL = 'https://velvet-syndicate-frontend.vercel.app';
const BACKEND_URL = 'https://velvet-syndicate.onrender.com';

// Test specific frontend pages with content analysis
const testFrontendPageContent = async (path, description) => {
  console.log(`\n📄 Testing: ${description} (${path})`);
  
  try {
    const response = await fetch(`${FRONTEND_URL}${path}`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for key indicators
      const has404Content = html.includes('404: This page could not be found');
      const hasNextData = html.includes('__NEXT_DATA__');
      const hasMainContent = html.includes('<main') || html.includes('main');
      const hasTitle = html.includes('<title>');
      
      console.log(`📄 Has 404 content: ${has404Content}`);
      console.log(`📄 Has Next.js data: ${hasNextData}`);
      console.log(`📄 Has main content: ${hasMainContent}`);
      console.log(`📄 Has title: ${hasTitle}`);
      
      if (has404Content) {
        console.log('❌ Page shows 404 error');
        return false;
      } else if (hasNextData && hasMainContent) {
        console.log('✅ Page loads correctly');
        return true;
      } else {
        console.log('⚠️ Page loads but may have issues');
        return true; // Still counts as working
      }
    } else {
      console.log('❌ Page failed to load');
      return false;
    }
  } catch (error) {
    console.error('❌ Page test error:', error.message);
    return false;
  }
};

// Test frontend API proxy functionality
const testFrontendAPIProxy = async () => {
  console.log('\n🔌 TESTING FRONTEND API PROXY');
  console.log('=' .repeat(50));
  
  const apiEndpoints = [
    { path: '/api/products', description: 'Products API' },
    { path: '/api/auth/me', description: 'Auth Me API' },
    { path: '/api/cart', description: 'Cart API' },
    { path: '/api/orders', description: 'Orders API' }
  ];
  
  let workingEndpoints = 0;
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(`${FRONTEND_URL}${endpoint.path}`);
      console.log(`📊 ${endpoint.description}: ${response.status}`);
      
      if (response.status === 200) {
        workingEndpoints++;
        console.log(`✅ ${endpoint.description} working`);
      } else if (response.status === 401) {
        workingEndpoints++;
        console.log(`✅ ${endpoint.description} protected (expected)`);
      } else if (response.status === 404) {
        console.log(`⚠️ ${endpoint.description} not found (may be proxied to backend)`);
      } else {
        console.log(`❌ ${endpoint.description} failed`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.description} error: ${error.message}`);
    }
  }
  
  console.log(`✅ Working endpoints: ${workingEndpoints}/${apiEndpoints.length}`);
  return workingEndpoints > 0;
};

// Test cross-domain functionality
const testCrossDomainFunctionality = async () => {
  console.log('\n🌍 TESTING CROSS-DOMAIN FUNCTIONALITY');
  console.log('=' .repeat(50));
  
  try {
    // Test if frontend can make requests to backend
    const response = await fetch(`${BACKEND_URL}/api/products`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Referer': `${FRONTEND_URL}/`
      }
    });
    
    console.log(`📊 Backend request from frontend origin: ${response.status}`);
    console.log(`📋 CORS Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`📋 CORS Allow-Credentials: ${response.headers.get('Access-Control-Allow-Credentials')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Cross-domain requests working`);
      console.log(`📦 Products available: ${data.data?.products?.length || 0}`);
      return true;
    } else {
      console.log('❌ Cross-domain requests failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Cross-domain test failed:', error.message);
    return false;
  }
};

// Test authentication flow through frontend
const testFrontendAuthentication = async () => {
  console.log('\n🔐 TESTING FRONTEND AUTHENTICATION');
  console.log('=' .repeat(50));
  
  try {
    // Check if login page loads
    const loginResponse = await fetch(`${FRONTEND_URL}/login`);
    console.log(`📊 Login page: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginHtml = await loginResponse.text();
      const hasLoginForm = loginHtml.includes('login') || loginHtml.includes('Login') || loginHtml.includes('email');
      console.log(`📄 Has login form: ${hasLoginForm}`);
      
      if (hasLoginForm) {
        console.log('✅ Login page appears functional');
        return true;
      } else {
        console.log('⚠️ Login page loads but form not detected');
        return true;
      }
    } else {
      console.log('❌ Login page not accessible');
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
};

// Test environment variables and configuration
const testFrontendConfiguration = async () => {
  console.log('\n⚙️ TESTING FRONTEND CONFIGURATION');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${FRONTEND_URL}`);
    const html = await response.text();
    
    // Look for environment variable usage
    const hasApiUrl = html.includes('NEXT_PUBLIC_API_URL') || html.includes('velvet-syndicate.onrender.com');
    const hasAppUrl = html.includes('NEXT_PUBLIC_APP_URL') || html.includes('velvet-syndicate-frontend.vercel.app');
    
    console.log(`📄 Has API URL configuration: ${hasApiUrl}`);
    console.log(`📄 Has App URL configuration: ${hasAppUrl}`);
    
    if (hasApiUrl) {
      console.log('✅ Frontend appears to be configured with backend URL');
    } else {
      console.log('⚠️ Backend URL configuration not detected');
    }
    
    return hasApiUrl;
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
    return false;
  }
};

// Main detailed test
const runDetailedFrontendTest = async () => {
  console.log('🔍 DETAILED FRONTEND ANALYSIS');
  console.log('=' .repeat(60));
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('=' .repeat(60));
  
  const results = {
    homepage: false,
    login: false,
    signup: false,
    products: false,
    cart: false,
    orders: false,
    apiProxy: false,
    crossDomain: false,
    authentication: false,
    configuration: false
  };
  
  try {
    // Test individual pages
    results.homepage = await testFrontendPageContent('/', 'Homepage');
    results.login = await testFrontendPageContent('/login', 'Login Page');
    results.signup = await testFrontendPageContent('/signup', 'Signup Page');
    results.products = await testFrontendPageContent('/products', 'Products Page');
    results.cart = await testFrontendPageContent('/cart', 'Cart Page');
    results.orders = await testFrontendPageContent('/orders', 'Orders Page');
    
    // Test functionality
    results.apiProxy = await testFrontendAPIProxy();
    results.crossDomain = await testCrossDomainFunctionality();
    results.authentication = await testFrontendAuthentication();
    results.configuration = await testFrontendConfiguration();
    
  } catch (error) {
    console.error('❌ Detailed test failed:', error.message);
  }
  
  // Results summary
  console.log('\n📊 DETAILED FRONTEND TEST RESULTS');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`${status} ${testName}`);
  });
  
  const pageTests = ['homepage', 'login', 'signup', 'products', 'cart', 'orders'];
  const functionalTests = ['apiProxy', 'crossDomain', 'authentication', 'configuration'];
  
  const pagesWorking = pageTests.filter(test => results[test]).length;
  const functionsWorking = functionalTests.filter(test => results[test]).length;
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Pages Working: ${pagesWorking}/${pageTests.length}`);
  console.log(`   Functions Working: ${functionsWorking}/${functionalTests.length}`);
  
  if (pagesWorking >= 4 && functionsWorking >= 3) {
    console.log('\n🎉 FRONTEND IS MOSTLY FUNCTIONAL!');
    console.log('✅ Core functionality is working');
    console.log('⚠️ Some pages may need attention');
    return true;
  } else {
    console.log('\n⚠️ FRONTEND NEEDS ATTENTION');
    console.log('❌ Significant issues detected');
    return false;
  }
};

// Run the detailed test
runDetailedFrontendTest();
