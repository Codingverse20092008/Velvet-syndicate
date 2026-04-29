/**
 * Quick test to fix cart size validation and complete e-commerce flow
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
    
    // Extract cookies
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const cookiePairs = setCookieHeader.split(',').map(cookie => cookie.split(';')[0].trim());
      cookies = cookiePairs.join('; ');
    }
    
    console.log(`${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`Error: ${data.error}`);
      return { success: false, error: data.error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const testCompleteFlow = async () => {
  console.log('🚀 TESTING COMPLETE E-COMMERCE FLOW');
  console.log('=' .repeat(50));
  
  try {
    // Login
    console.log('🔐 Logging in...');
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
    
    // Get products
    console.log('📦 Getting products...');
    const productsResponse = await callAPI('/products');
    if (!productsResponse.success) {
      throw new Error('Products fetch failed');
    }
    
    const products = productsResponse.data.data.products;
    const firstProduct = products[0];
    const firstVariant = firstProduct.variants[0];
    const availableSizes = firstVariant.sizes.map(s => s.size);
    
    console.log(`📊 Product: ${firstProduct.name}`);
    console.log(`📊 Available sizes: ${availableSizes.join(', ')}`);
    
    // Add to cart with correct size
    console.log('🛒 Adding to cart...');
    const addResponse = await callAPI('/cart', {
      method: 'POST',
      body: JSON.stringify({
        productId: firstProduct.id,
        variantId: firstVariant.id,
        size: availableSizes[0], // Use first available size
        quantity: 1
      })
    });
    
    if (!addResponse.success) {
      throw new Error('Add to cart failed: ' + addResponse.error);
    }
    
    console.log('✅ Item added to cart');
    
    // Check cart
    console.log('🛍️ Checking cart...');
    const cartResponse = await callAPI('/cart');
    if (cartResponse.success) {
      const cartItems = cartResponse.data.data.cart.items;
      console.log(`✅ Cart has ${cartItems.length} items`);
      
      if (cartItems.length > 0) {
        const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        console.log(`💰 Cart total: $${total}`);
      }
    }
    
    // Create address
    console.log('🏠 Creating address...');
    const addressResponse = await callAPI('/user/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        phone: '+1234567890',
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        pincode: '12345',
        isDefault: true
      })
    });
    
    if (!addressResponse.success) {
      throw new Error('Address creation failed');
    }
    
    // Create order
    console.log('📦 Creating order...');
    const orderResponse = await callAPI('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{
          productId: firstProduct.id,
          variantId: firstVariant.id,
          quantity: 1,
          size: availableSizes[0]
        }],
        shippingAddress: addressResponse.data.data.address,
        paymentMethod: 'COD',
        totalAmount: firstProduct.price
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
    console.log('📋 Checking order history...');
    const ordersResponse = await callAPI('/orders');
    if (ordersResponse.success) {
      const orders = ordersResponse.data.data.orders;
      console.log(`✅ Found ${orders.length} orders in history`);
    }
    
    console.log('\n🎉 COMPLETE E-COMMERCE FLOW SUCCESSFUL!');
    console.log('✅ Login → Cart → Address → Order → History');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
};

testCompleteFlow();
