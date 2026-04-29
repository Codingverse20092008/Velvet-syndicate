/**
 * E2E Checkout Flow Test
 * Tests: Signup -> Login -> Add to Cart -> Checkout (COD) -> Order Tracking
 */

const BASE_URL = 'https://velvet-syndicate.onrender.com';

// Test user credentials
const NEW_USER = {
  name: 'Test User',
  email: 'chattingwebsiteonline@example.com',
  phone: '9876543210',
  password: '123456789'
};

const EXISTING_USER = {
  email: 'admin@velvetsyndicate.com',
  password: 'admin123'
};

let authToken = null;
let refreshToken = null;
let productId = null;
let orderId = null;

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message, data: null };
  }
}

// Test 1: Signup with new user
async function testSignup() {
  console.log('\n📝 TEST 1: Signup with new user');
  console.log(`Email: ${NEW_USER.email}`);
  console.log(`Password: ${NEW_USER.password}`);
  
  const result = await apiCall('/api/auth/signup', 'POST', NEW_USER);
  
  if (result.status === 201 || result.status === 200) {
    console.log('✅ Signup successful');
    console.log(`User created: ${result.data?.user?.name}`);
    // Signup doesn't return tokens, need to login
    return testLogin(NEW_USER.email, NEW_USER.password);
  } else if (result.status === 409) {
    console.log('⚠️ User already exists, proceeding to login');
    return testLogin(NEW_USER.email, NEW_USER.password);
  } else {
    console.log('❌ Signup failed:', result.data || result.error);
    return false;
  }
}

// Test 2: Login
async function testLogin(email, password) {
  console.log(`\n🔑 TEST 2: Login with ${email}`);
  
  const result = await apiCall('/api/auth/login', 'POST', { email, password });
  
  // Extract tokens from nested structure (result.data.data.accessToken)
  const accessToken = result.data?.accessToken || result.data?.data?.accessToken;
  const refreshTok = result.data?.refreshToken || result.data?.data?.refreshToken;
  
  if (result.status === 200 && accessToken) {
    console.log('✅ Login successful');
    authToken = accessToken;
    refreshToken = refreshTok;
    const user = result.data?.user || result.data?.data?.user;
    console.log(`User: ${user?.name || 'Unknown'} (${user?.role || 'user'})`);
    return true;
  } else {
    console.log('❌ Login failed');
    console.log('Status:', result.status);
    console.log('Data:', JSON.stringify(result.data, null, 2));
    console.log('Error:', result.error);
    return false;
  }
}

// Test 3: Get Products
async function testGetProducts() {
  console.log('\n📦 TEST 3: Fetch products');
  
  const result = await apiCall('/api/products?limit=5');
  
  if (result.status === 200 && result.data?.success) {
    const products = result.data.data?.products || [];
    console.log(`✅ Found ${products.length} products`);
    
    if (products.length > 0) {
      productId = products[0].id;
      console.log(`Selected product: ${products[0].name} (${productId})`);
      return true;
    }
  }
  
  console.log('❌ Failed to fetch products');
  return false;
}

// Test 4: Add to Cart
async function testAddToCart() {
  console.log('\n🛒 TEST 4: Add product to cart');
  
  if (!productId) {
    console.log('❌ No product ID available');
    return false;
  }
  
  const cartItem = {
    productId: productId,
    variantId: null,
    size: '8',
    quantity: 1
  };
  
  const result = await apiCall('/api/cart', 'POST', cartItem, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.status === 200 || result.status === 201) {
    console.log('✅ Product added to cart');
    return true;
  } else {
    console.log('❌ Failed to add to cart:', result.data?.message || result.error);
    return false;
  }
}

// Test 5: Get Cart
async function testGetCart() {
  console.log('\n🛒 TEST 5: Get cart contents');
  
  const result = await apiCall('/api/cart', 'GET', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.status === 200) {
    const items = result.data?.items || [];
    console.log(`✅ Cart has ${items.length} items`);
    items.forEach(item => {
      console.log(`  - ${item.productName}: ${item.quantity} x $${item.price}`);
    });
    return true;
  } else {
    console.log('❌ Failed to get cart:', result.data?.message || result.error);
    return false;
  }
}

// Test 6: Checkout with COD
async function testCheckout() {
  console.log('\n💳 TEST 6: Checkout with COD');
  
  const orderData = {
    items: [{
      productId: productId,
      variantId: null,
      size: '8',
      quantity: 1
    }],
    shippingAddress: {
      name: 'Test User',
      phone: '9876543210',
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    },
    paymentMethod: 'COD'
  };
  
  const result = await apiCall('/api/orders', 'POST', orderData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.status === 201 || (result.status === 200 && result.data?.success)) {
    console.log('✅ Order placed successfully');
    orderId = result.data?.order?.id || result.data?.data?.order?.id;
    console.log(`Order ID: ${orderId}`);
    console.log(`Total: $${result.data?.order?.total || result.data?.data?.order?.total}`);
    return true;
  } else {
    console.log('❌ Checkout failed:', result.data?.message || result.error);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return false;
  }
}

// Test 7: Get Orders
async function testGetOrders() {
  console.log('\n📋 TEST 7: Get user orders');
  
  const result = await apiCall('/api/orders', 'GET', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.status === 200) {
    const orders = result.data?.orders || result.data?.data || [];
    console.log(`✅ Found ${orders.length} orders`);
    orders.forEach(order => {
      console.log(`  - Order ${order.id}: ${order.status} - $${order.totalAmount || order.total}`);
    });
    return true;
  } else {
    console.log('❌ Failed to get orders:', result.data?.message || result.error);
    return false;
  }
}

// Test 8: Track Order
async function testTrackOrder() {
  console.log('\n📍 TEST 8: Track order');
  
  if (!orderId) {
    console.log('❌ No order ID available');
    return false;
  }
  
  const result = await apiCall(`/api/orders/${orderId}`, 'GET', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.status === 200) {
    const order = result.data?.order || result.data?.data;
    console.log('✅ Order details retrieved');
    console.log(`  Status: ${order?.status}`);
    console.log(`  Total: $${order?.totalAmount || order?.total}`);
    console.log(`  Items: ${order?.items?.length || 0}`);
    return true;
  } else {
    console.log('❌ Failed to track order:', result.data?.message || result.error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 STARTING E2E CHECKOUT FLOW TEST');
  console.log('=====================================');
  console.log(`Backend: ${BASE_URL}`);
  
  const results = {
    signup: await testSignup(),
    products: await testGetProducts(),
    addToCart: await testAddToCart(),
    getCart: await testGetCart(),
    checkout: await testCheckout(),
    getOrders: await testGetOrders(),
    trackOrder: await testTrackOrder()
  };
  
  // Test login with different account
  console.log('\n🔑 BONUS: Testing login with different account');
  results.loginDifferent = await testLogin(EXISTING_USER.email, EXISTING_USER.password);
  
  console.log('\n=====================================');
  console.log('📊 TEST SUMMARY');
  console.log('=====================================');
  
  let passed = 0;
  let total = 0;
  
  for (const [test, result] of Object.entries(results)) {
    total++;
    if (result) passed++;
    console.log(`${result ? '✅' : '❌'} ${test}`);
  }
  
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Checkout flow is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
}

runTests().catch(console.error);
