/**
 * Test different phone number formats for address creation
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

const testPhoneFormats = async () => {
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
  
  const phoneFormats = [
    '9876543210',
    '+919876543210',
    '+1234567890',
    '9999999999',
    '+91-9876543210',
    '9123456789'
  ];
  
  for (const phone of phoneFormats) {
    console.log(`\n📞 Testing phone format: ${phone}`);
    
    const addressResponse = await callAPI('/user/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        phone: phone,
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        pincode: '123456',
        isDefault: true
      })
    });
    
    if (addressResponse.success) {
      console.log(`✅ SUCCESS with phone: ${phone}`);
      return addressResponse.data.data.address;
    } else {
      console.log(`❌ Failed with phone: ${phone}`);
    }
  }
  
  throw new Error('All phone formats failed');
};

testPhoneFormats();
