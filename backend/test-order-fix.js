/**
 * Debug and fix order creation issue
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

const debugOrderCreation = async () => {
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
  
  console.log('📦 Getting products...');
  const productsResponse = await callAPI('/products');
  const products = productsResponse.data.data.products;
  const firstProduct = products[0];
  const firstVariant = firstProduct.variants[0];
  const selectedSize = firstVariant.sizes[0].size;
  
  console.log('🛒 Adding to cart...');
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
  
  console.log('🛍️ Getting cart contents...');
  const cartResponse = await callAPI('/cart');
  const cartItems = cartResponse.data.data.cart.items;
  
  console.log('🏠 Creating address...');
  const addressResponse = await callAPI('/user/addresses', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      phone: '9876543210',
      street: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      pincode: '123456',
      isDefault: true
    })
  });
  
  if (!addressResponse.success) {
    throw new Error('Address creation failed');
  }
  
  const address = addressResponse.data.data.address;
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  console.log('📦 Cart items:');
  cartItems.forEach((item, index) => {
    console.log(`  ${index + 1}. Product: ${item.product.name}`);
    console.log(`     ProductId: ${item.productId}`);
    console.log(`     VariantId: ${item.variantId}`);
    console.log(`     Size: ${item.size}`);
    console.log(`     Quantity: ${item.quantity}`);
    console.log(`     Price: $${item.product.price}`);
  });
  
  console.log('\n📦 Creating order with payload:');
  const orderPayload = {
    items: cartItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      size: item.size
    })),
    shippingAddress: {
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode
    },
    paymentMethod: 'COD',
    totalAmount: cartTotal
  };
  
  console.log(JSON.stringify(orderPayload, null, 2));
  
  console.log('\n📦 Sending order request...');
  const orderResponse = await callAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(orderPayload)
  });
  
  if (orderResponse.success) {
    console.log('✅ Order created successfully!');
    console.log(`Order ID: ${orderResponse.data.data.order.id}`);
  } else {
    console.log('❌ Order creation failed');
  }
};

debugOrderCreation();
