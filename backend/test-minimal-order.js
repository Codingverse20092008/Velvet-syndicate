/**
 * Test minimal order creation to identify the undefined field
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

const testMinimalOrder = async () => {
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
  
  console.log('📦 Getting single product...');
  const productsResponse = await callAPI('/products');
  const products = productsResponse.data.data.products;
  const firstProduct = products[0];
  const firstVariant = firstProduct.variants[0];
  const selectedSize = firstVariant.sizes[0].size;
  
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
  
  // Try minimal order payload
  console.log('\n📦 Testing minimal order payload...');
  const minimalOrderPayload = {
    items: [{
      productId: firstProduct.id,
      variantId: firstVariant.id,
      quantity: 1,
      size: selectedSize
    }],
    shippingAddress: {
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode
    },
    paymentMethod: 'COD',
    totalAmount: firstProduct.price
  };
  
  console.log('Payload:', JSON.stringify(minimalOrderPayload, null, 2));
  
  const orderResponse = await callAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(minimalOrderPayload)
  });
  
  if (orderResponse.success) {
    console.log('✅ Minimal order successful!');
    console.log(`Order ID: ${orderResponse.data.data.order.id}`);
  } else {
    console.log('❌ Minimal order failed');
    
    // Try without shippingAddress object (pass address ID directly)
    console.log('\n📦 Testing with address ID...');
    const addressIdPayload = {
      items: [{
        productId: firstProduct.id,
        variantId: firstVariant.id,
        quantity: 1,
        size: selectedSize
      }],
      shippingAddressId: address.id,
      paymentMethod: 'COD',
      totalAmount: firstProduct.price
    };
    
    console.log('Payload with address ID:', JSON.stringify(addressIdPayload, null, 2));
    
    const addressIdResponse = await callAPI('/orders', {
      method: 'POST',
      body: JSON.stringify(addressIdPayload)
    });
    
    if (addressIdResponse.success) {
      console.log('✅ Order with address ID successful!');
      console.log(`Order ID: ${addressIdResponse.data.data.order.id}`);
    } else {
      console.log('❌ Address ID approach also failed');
    }
  }
};

testMinimalOrder();
