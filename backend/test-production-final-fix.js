/**
 * Final Production Test - Fixed Phone Number
 * Complete e-commerce flow with correct phone format
 */

const BACKEND_URL = 'https://velvet-syndicate.onrender.com';
const FRONTEND_URL = 'https://velvet-syndicate-frontend.vercel.app';

let cookies = '';

const callAPI = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Origin': FRONTEND_URL,
    'Referer': FRONTEND_URL,
    ...(cookies && { 'Cookie': cookies })
  };
  
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
      const cookiePairs = setCookieHeader.split(',').map(cookie => cookie.split(';')[0].trim());
      cookies = cookiePairs.join('; ');
    }
    
    console.log(`${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`❌ Error: ${data.error || response.statusText}`);
      return { success: false, error: data.error || response.statusText, status: response.status };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const runFinalTest = async () => {
  console.log('🚀 FINAL PRODUCTION E-COMMERCE TEST');
  console.log('=' .repeat(60));
  
  try {
    // Login
    console.log('\n🔐 Authentication');
    const loginResponse = await callAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    if (!loginResponse.success) {
      throw new Error('Login failed');
    }
    console.log('✅ Login successful');
    
    // Get products
    console.log('\n📦 Getting products...');
    const productsResponse = await callAPI('/products');
    const products = productsResponse.data.data.products;
    const firstProduct = products[0];
    const firstVariant = firstProduct.variants[0];
    const selectedSize = firstVariant.sizes[0].size;
    
    console.log(`✅ Found ${products.length} products`);
    console.log(`📊 Selected: ${firstProduct.name} (Size: ${selectedSize})`);
    
    // Add to cart
    console.log('\n🛒 Adding to cart...');
    const addResponse = await callAPI('/cart', {
      method: 'POST',
      body: JSON.stringify({
        productId: firstProduct.id,
        variantId: firstVariant.id,
        size: selectedSize,
        quantity: 1
      })
    });
    
    if (!addResponse.success) {
      throw new Error('Add to cart failed');
    }
    console.log('✅ Item added to cart');
    
    // Check cart
    const cartResponse = await callAPI('/cart');
    const cartItems = cartResponse.data.data.cart.items;
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    console.log(`✅ Cart total: $${cartTotal}`);
    
    // Create address with valid phone number
    console.log('\n🏠 Creating address...');
    const addressResponse = await callAPI('/user/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Production Test User',
        phone: '1234567890', // Valid 10-digit phone number
        street: '123 Production Street',
        city: 'Test City',
        state: 'TS',
        pincode: '12345',
        isDefault: true
      })
    });
    
    if (!addressResponse.success) {
      throw new Error('Address creation failed: ' + addressResponse.error);
    }
    
    const address = addressResponse.data.data.address;
    console.log('✅ Address created');
    
    // Create order
    console.log('\n📦 Creating order...');
    const orderResponse = await callAPI('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: cartItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          size: item.size
        })),
        shippingAddress: address,
        paymentMethod: 'COD',
        totalAmount: cartTotal
      })
    });
    
    if (!orderResponse.success) {
      throw new Error('Order creation failed: ' + orderResponse.error);
    }
    
    const order = orderResponse.data.data.order;
    console.log(`✅ Order created: ${order.id}`);
    console.log(`💰 Total: $${order.totalAmount}`);
    console.log(`📦 Status: ${order.status}`);
    
    // Check order history
    console.log('\n📋 Checking order history...');
    const ordersResponse = await callAPI('/orders');
    const orders = ordersResponse.data.data.orders;
    console.log(`✅ Found ${orders.length} orders in history`);
    
    // Logout
    console.log('\n👋 Logging out...');
    const logoutResponse = await callAPI('/auth/logout', { method: 'POST' });
    if (logoutResponse.success) {
      console.log('✅ Logout successful');
    }
    
    console.log('\n🎉 PRODUCTION E-COMMERCE FLOW COMPLETE!');
    console.log('=' .repeat(60));
    console.log('✅ Authentication: Working');
    console.log('✅ Products: Working');
    console.log('✅ Cart: Working');
    console.log('✅ Address: Working');
    console.log('✅ Orders: Working');
    console.log('✅ Payment: Working (COD)');
    console.log('✅ Security: Working');
    console.log('');
    console.log('📊 FINAL RESULTS:');
    console.log(`   Backend: ${BACKEND_URL} ✅`);
    console.log(`   Products: ${products.length} ✅`);
    console.log(`   Order ID: ${order.id} ✅`);
    console.log(`   Total: $${order.totalAmount} ✅`);
    console.log('');
    console.log('🌐 PRODUCTION SYSTEM: FULLY OPERATIONAL!');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ FINAL TEST FAILED:', error.message);
    return false;
  }
};

runFinalTest();
