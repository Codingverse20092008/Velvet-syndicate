/**
 * Test the collection page to see if products are showing
 */

const FRONTEND_URL = 'https://velvet-syndicate.vercel.app';

const testCollectionPage = async () => {
  console.log('🛍️ TESTING COLLECTION PAGE');
  console.log('=' .repeat(40));
  console.log(`URL: ${FRONTEND_URL}/collection`);
  console.log('=' .repeat(40));
  
  try {
    // Test the collection page
    const response = await fetch(`${FRONTEND_URL}/collection`);
    console.log(`📊 Collection Page Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for collection content
      const hasCollectionContent = html.includes('CollectionContent');
      const hasProductGrid = html.includes('ProductCard');
      const hasProductsFound = html.includes('products found');
      const hasNoProducts = html.includes('No products found');
      const hasLoading = html.includes('Loading...');
      const hasFilterPanel = html.includes('FilterPanel');
      const hasNextData = html.includes('__NEXT_DATA__');
      
      console.log('\n🔍 COLLECTION PAGE CHECKS:');
      console.log(`📦 CollectionContent: ${hasCollectionContent}`);
      console.log(`🎴 ProductCard: ${hasProductGrid}`);
      console.log(`📊 Products Found: ${hasProductsFound}`);
      console.log(`❌ No Products: ${hasNoProducts}`);
      console.log(`⏳ Loading: ${hasLoading}`);
      console.log(`🎛️ FilterPanel: ${hasFilterPanel}`);
      console.log(`✅ Next.js Data: ${hasNextData}`);
      
      // Test the API directly
      console.log('\n🔌 TESTING PRODUCT API:');
      try {
        const apiResponse = await fetch(`${FRONTEND_URL}/api/products`);
        console.log(`📊 API Status: ${apiResponse.status}`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          const productCount = apiData.data?.products?.length || 0;
          console.log(`📦 Products Available: ${productCount}`);
          
          if (productCount > 0) {
            console.log('✅ API is working and has products');
            console.log('🔍 Issue might be in frontend component');
          } else {
            console.log('❌ API has no products');
          }
        } else {
          console.log(`❌ API failed: ${apiResponse.status}`);
        }
      } catch (error) {
        console.log(`❌ API error: ${error.message}`);
      }
      
      return {
        pageWorking: response.ok,
        hasProducts: hasProductsFound || hasProductGrid,
        apiWorking: true
      };
    } else {
      console.log(`❌ Collection page failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
    return false;
  }
};

testCollectionPage();
