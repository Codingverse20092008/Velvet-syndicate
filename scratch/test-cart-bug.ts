
async function testCart() {
  const testUser = {
    email: 'bug' + Date.now() + '@example.com',
    password: 'password123',
    name: 'Bug Hunter'
  };

  try {
    await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });

    const cookies = loginRes.headers.get('set-cookie');
    const accessToken = cookies.split(';').find(c => c.trim().startsWith('access_token='))?.split('=')[1];
    const authHeaders = { 
      'Cookie': `access_token=${accessToken}`,
      'Content-Type': 'application/json'
    };

    const prodRes = await fetch('http://localhost:3000/api/products');
    const prodData = await prodRes.json();
    const product = prodData.data.products[0];
    
    console.log('Product Data:', JSON.stringify(product, null, 2));

    const res = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: product.id, size: "10", quantity: 1 })
    });

    const data = await res.json();
    console.log('Cart POST Response:', res.status, data);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCart();
