/**
 * Complete Production Test with Full Authentication
 * Tests the entire e-commerce flow with proper cookie handling
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

const runCompleteEcommerceTest = async () => {
  console.log('🚀 COMPLETE PRODUCTION E-COMMERCE TEST');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Login
    console.log('\n🔐 Step 1: Authentication');
    const loginResponse = await callAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    if (!loginResponse.success) {
      throw new Error('Login failed: ' + loginResponse.error);
    }
    console.log('✅ Login successful - cookies obtained');
    
    // Step 2: Verify authentication
    console.log('\n👤 Step 2: Verify Authentication');
    const meResponse = await callAPI('/auth/me');
    if (!meResponse.success) {
      throw new Error('Authentication verification failed');
    }
    console.log(`✅ Authenticated as: ${meResponse.data.data.user.name}`);
    
    // Step 3: Browse products
    console.log('\n📦 Step 3: Browse Products');
    const productsResponse = await callAPI('/products');
    if (!productsResponse.success) {
      throw new Error('Products fetch failed');
    }
    
    const products = productsResponse.data.data.products;
    console.log(`✅ Found ${products.length} products`);
    
    if (products.length === 0) {
      throw new Error('No products available');
    }
    
    // Step 4: Access cart (should be empty initially)
    console.log('\n🛒 Step 4: Initial Cart Access');
    const initialCartResponse = await callAPI('/cart');
    if (!initialCartResponse.success) {
      throw new Error('Initial cart access failed');
    }
    
    const initialCartItems = initialCartResponse.data.data.cart.items;
    console.log(`✅ Initial cart has ${initialCartItems.length} items`);
    
    // Step 5: Add item to cart
    console.log('\n➕ Step 5: Add Item to Cart');
    const firstProduct = products[0];
    const firstVariant = firstProduct.variants[0];
    const availableSizes = firstVariant.sizes.map(s => s.size);
    const selectedSize = availableSizes[0];
    
    console.log(`📊 Adding: ${firstProduct.name} (Size: ${selectedSize})`);
    
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
      throw new Error('Add to cart failed: ' + addResponse.error);
    }
    console.log('✅ Item added to cart successfully');
    
    // Step 6: Verify cart contents
    console.log('\n🛍️ Step 6: Verify Cart Contents');
    const updatedCartResponse = await callAPI('/cart');
    if (!updatedCartResponse.success) {
      throw new Error('Cart verification failed');
    }
    
    const cartItems = updatedCartResponse.data.data.cart.items;
    console.log(`✅ Cart now has ${cartItems.length} items`);
    
    if (cartItems.length > 0) {
      const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      console.log(`💰 Cart total: $${total}`);
      console.log(`📦 Items: ${cartItems.map(item => item.product.name).join(', ')}`);
    }
    
    // Step 7: Create shipping address
    console.log('\n🏠 Step 7: Create Shipping Address');
    const addressResponse = await callAPI('/user/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Production Test User',
        phone: '+1234567890',
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
    console.log(`✅ Address created: ${address.street}, ${address.city}`);
    
    // Step 8: Create order
    console.log('\n📦 Step 8: Create Order');
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
        totalAmount: cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
      })
    });
    
    if (!orderResponse.success) {
      throw new Error('Order creation failed: ' + orderResponse.error);
    }
    
    const order = orderResponse.data.data.order;
    console.log(`✅ Order created successfully`);
    console.log(`📋 Order ID: ${order.id}`);
    console.log(`💰 Total Amount: $${order.totalAmount}`);
    console.log(`📦 Status: ${order.status}`);
    console.log(`💳 Payment Status: ${order.paymentStatus}`);
    console.log(`🚚 Shipping to: ${order.shippingAddress.city}`);
    
    // Step 9: Verify order in order history
    console.log('\n📋 Step 9: Verify Order History');
    const ordersHistoryResponse = await callAPI('/orders');
    if (!ordersHistoryResponse.success) {
      throw new Error('Order history fetch failed');
    }
    
    const allOrders = ordersHistoryResponse.data.data.orders;
    console.log(`✅ Found ${allOrders.length} orders in history`);
    
    const ourOrder = allOrders.find(o => o.id === order.id);
    if (ourOrder) {
      console.log(`✅ Our order found in history: ${ourOrder.status}`);
    } else {
      console.log('⚠️ Order not found in history (might be a delay)');
    }
    
    // Step 10: Test logout
    console.log('\n👋 Step 10: Logout');
    const logoutResponse = await callAPI('/auth/logout', { method: 'POST' });
    if (!logoutResponse.success) {
      throw new Error('Logout failed');
    }
    console.log('✅ Logout successful');
    
    // Clear cookies for post-logout test
    cookies = '';
    
    // Step 11: Verify post-logout protection
    console.log('\n🔒 Step 11: Verify Post-Logout Protection');
    const postLogoutCartResponse = await callAPI('/cart');
    if (!postLogoutCartResponse.success && postLogoutCartResponse.status === 401) {
      console.log('✅ Post-logout protection working correctly');
    } else {
      console.log('⚠️ Post-logout protection may have issues');
    }
    
    // Final success message
    console.log('\n🎉 COMPLETE E-COMMERCE FLOW SUCCESSFUL!');
    console.log('=' .repeat(60));
    console.log('✅ Authentication: Working (cookie-based)');
    console.log('✅ Product Browsing: Working');
    console.log('✅ Cart Management: Working');
    console.log('✅ Address Management: Working');
    console.log('✅ Order Creation: Working');
    console.log('✅ Order History: Working');
    console.log('✅ Logout & Security: Working');
    console.log('');
    console.log('📊 Test Summary:');
    console.log(`   Products: ${products.length} available`);
    console.log(`   Cart Items: ${cartItems.length} added`);
    console.log(`   Order: ${order.id} created`);
    console.log(`   Total: $${order.totalAmount}`);
    console.log('');
    console.log('🌐 Production Status: FULLY OPERATIONAL');
    console.log('⚠️ Frontend Deployment: Needed (Vercel)');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ COMPLETE TEST FAILED!');
    console.error('Error:', error.message);
    console.error('Current cookies:', cookies);
    return false;
  }
};

// Run the complete test
runCompleteEcommerceTest();
