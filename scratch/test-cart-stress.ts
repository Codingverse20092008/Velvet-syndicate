
async function testCartStress() {
  console.log('--- STARTING CART STRESS TEST ---');

  const testUser = {
    email: 'cart' + Date.now() + '@example.com',
    password: 'password123',
    name: 'Cart Tester'
  };

  try {
    // 1. Signup & Login to get session
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
    if (!cookies) throw new Error('No cookies received');
    
    // Extract access_token
    const accessToken = cookies.split(';').find(c => c.trim().startsWith('access_token='))?.split('=')[1];
    const authHeaders = { 
      'Cookie': `access_token=${accessToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Get a product to test with
    const prodRes = await fetch('http://localhost:3000/api/products');
    const prodData = await prodRes.json();
    const product = prodData.data.products[0];
    const productId = product.id;
    const size = "10";

    console.log(`Testing with Product: ${product.name}, ID: ${productId}`);

    // 3. Stress: Add same product 10 times rapidly
    console.log('Adding product 10 times rapidly...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(fetch('http://localhost:3000/api/cart', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ productId, size, quantity: 1 })
      }));
    }
    const results = await Promise.all(promises);
    console.log('Bulk add complete. Statuses:', results.map(r => r.status));

    // 4. Verify merge (should have 1 item with quantity 10)
    const cartRes = await fetch('http://localhost:3000/api/cart', { headers: authHeaders });
    const cartData = await cartRes.json();
    const cartItem = cartData.data.items.find(i => i.productId === productId && i.size === size);
    
    console.log('Cart Items:', cartData.data.items.length);
    if (cartItem) {
      console.log('Quantity after 10 adds:', cartItem.quantity);
      if (cartItem.quantity === 10) {
        console.log('SUCCESS: Merged correctly.');
      } else {
        console.log('FAILURE: Merged incorrectly, quantity is', cartItem.quantity);
      }
    } else {
      console.log('FAILURE: Product not in cart');
    }

    // 5. Add out of stock (edge case)
    console.log('Testing out of stock add...');
    const outRes = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId, size: "99", quantity: 1 }) // size 99 doesn't exist
    });
    const outData = await outRes.json();
    console.log('Out of stock/Invalid size response:', outRes.status, outData.error);

    console.log('--- CART STRESS TEST COMPLETE ---');
  } catch (error) {
    console.error('Cart stress test failed:', error);
  }
}

testCartStress();
