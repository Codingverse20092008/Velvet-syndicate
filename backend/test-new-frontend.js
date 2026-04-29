/**
 * Test the newly deployed frontend
 */

const NEW_FRONTEND_URL = 'https://velvet-syndicate.vercel.app';
const BACKEND_URL = 'https://velvet-syndicate.onrender.com';

const testNewFrontend = async () => {
  console.log('🚀 TESTING NEWLY DEPLOYED FRONTEND');
  console.log('=' .repeat(50));
  console.log(`New Frontend URL: ${NEW_FRONTEND_URL}`);
  console.log('=' .repeat(50));
  
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/login', name: 'Login' },
    { path: '/signup', name: 'Signup' },
    { path: '/collection', name: 'Collection' },
    { path: '/products', name: 'Products' },
    { path: '/cart', name: 'Cart' },
    { path: '/orders', name: 'Orders' }
  ];
  
  let workingPages = 0;
  
  for (const page of pages) {
    try {
      const response = await fetch(`${NEW_FRONTEND_URL}${page.path}`);
      console.log(`📊 ${page.name}: ${response.status}`);
      
      if (response.ok) {
        const html = await response.text();
        const has404Content = html.includes('404: This page could not be found');
        const hasNextData = html.includes('__NEXT_DATA__');
        const hasMainContent = html.includes('<main') || html.includes('main');
        const hasTitle = html.includes('<title>');
        
        console.log(`📄 Has 404 content: ${has404Content}`);
        console.log(`📄 Has Next.js data: ${hasNextData}`);
        console.log(`📄 Has main content: ${hasMainContent}`);
        console.log(`📄 Has title: ${hasTitle}`);
        
        if (!has404Content && (hasNextData || hasMainContent)) {
          workingPages++;
          console.log(`✅ ${page.name} working`);
        } else {
          console.log(`❌ ${page.name} shows 404 or broken content`);
        }
      } else {
        console.log(`❌ ${page.name} failed to load`);
      }
    } catch (error) {
      console.log(`❌ ${page.name} error: ${error.message}`);
    }
    
    console.log(''); // Add spacing
  }
  
  // Test API proxy
  console.log('🔌 TESTING API PROXY');
  console.log('=' .repeat(30));
  
  try {
    const apiResponse = await fetch(`${NEW_FRONTEND_URL}/api/products`);
    console.log(`📊 API Proxy Status: ${apiResponse.status}`);
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log(`✅ API proxy working`);
      console.log(`📦 Products available: ${apiData.data?.products?.length || 0}`);
    } else {
      console.log(`❌ API proxy failed`);
    }
  } catch (error) {
    console.log(`❌ API proxy error: ${error.message}`);
  }
  
  console.log('\n📊 SUMMARY');
  console.log('=' .repeat(20));
  console.log(`Working Pages: ${workingPages}/${pages.length}`);
  console.log(`Success Rate: ${Math.round((workingPages / pages.length) * 100)}%`);
  
  if (workingPages >= pages.length * 0.8) {
    console.log('🎉 FRONTEND DEPLOYMENT SUCCESSFUL!');
  } else {
    console.log('⚠️ Frontend still has issues');
  }
};

testNewFrontend();
