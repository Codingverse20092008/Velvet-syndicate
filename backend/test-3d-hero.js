/**
 * Test if the 3D hero component is loading
 */

const FRONTEND_URL = 'https://velvet-syndicate.vercel.app';

const test3DHero = async () => {
  console.log('🎮 TESTING 3D HERO COMPONENT');
  console.log('=' .repeat(40));
  console.log(`URL: ${FRONTEND_URL}`);
  console.log('=' .repeat(40));
  
  try {
    const response = await fetch(FRONTEND_URL);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for 3D-related indicators
      const hasHero3D = html.includes('Hero3D');
      const hasThreeJS = html.includes('three') || html.includes('THREE');
      const hasCanvas = html.includes('canvas');
      const hasWebGL = html.includes('webgl') || html.includes('WebGL');
      const hasDynamicImport = html.includes('dynamic');
      const hasHeroSection = html.includes('h-screen');
      
      console.log('\n🎨 3D COMPONENT CHECKS:');
      console.log(`📦 Hero3D Component: ${hasHero3D}`);
      console.log(`🎮 Three.js: ${hasThreeJS}`);
      console.log(`🖼️ Canvas: ${hasCanvas}`);
      console.log(`🌐 WebGL: ${hasWebGL}`);
      console.log(`⚡ Dynamic Import: ${hasDynamicImport}`);
      console.log(`📱 Hero Section: ${hasHeroSection}`);
      
      if (hasHero3D || hasDynamicImport || hasHeroSection) {
        console.log('\n✅ 3D Hero component is likely loading!');
        console.log('🎮 The 3D rotating shoes should be visible');
        console.log('🌐 Check the website to see the 3D animation');
      } else {
        console.log('\n⚠️ 3D component might not be loading properly');
        console.log('🔧 May need to check component imports');
      }
      
      // Check for any error indicators
      const hasErrors = html.includes('error') || html.includes('Error');
      const hasLoading = html.includes('loading') || html.includes('Loading');
      
      console.log('\n🔍 STATUS CHECKS:');
      console.log(`❌ Errors: ${hasErrors}`);
      console.log(`⏳ Loading: ${hasLoading}`);
      
      return hasHero3D || hasDynamicImport;
    } else {
      console.log(`❌ Failed to load: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
    return false;
  }
};

test3DHero();
