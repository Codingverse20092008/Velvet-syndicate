
async function testFullFlow() {
  console.log('--- STARTING FULL E2E TEST ---');

  const testUser = {
    email: 'qa' + Date.now() + '@example.com',
    password: 'password123',
    name: 'QA Tester'
  };

  try {
    // 1. Setup Session
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

    // 2. Fetch Products
    const prodRes = await fetch('http://localhost:3000/api/products');
    const prodData = await prodRes.json();
    const product = prodData.data.products[0];
    const productId = product.id;
    const size = product.sizes[0].toString(); // sizes is number[], need string for API
    console.log(`Product: ${product.name}, Size: ${size}`);

    // 3. Cart Operations
    console.log('Adding to cart...');
    await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId, size, quantity: 1 })
    });

    // Rapid Add
    console.log('Rapid add (3 times)...');
    await Promise.all([
      fetch('http://localhost:3000/api/cart', { method: 'POST', headers: authHeaders, body: JSON.stringify({ productId, size, quantity: 1 }) }),
      fetch('http://localhost:3000/api/cart', { method: 'POST', headers: authHeaders, body: JSON.stringify({ productId, size, quantity: 1 }) }),
      fetch('http://localhost:3000/api/cart', { method: 'POST', headers: authHeaders, body: JSON.stringify({ productId, size, quantity: 1 }) })
    ]);

    // Verify Cart
    const cartRes = await fetch('http://localhost:3000/api/cart', { headers: authHeaders });
    const cartData = await cartRes.json();
    const cartItems = cartData.data.cart.items;
    console.log('Cart Items Count:', cartItems.length);
    console.log('Merged Quantity:', cartItems[0].quantity);

    // 4. Checkout
    console.log('Starting Checkout...');
    const orderRes = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ shippingAddress: '123 QA Lane' })
    });
    const orderData = await orderRes.json();
    console.log('Order Status:', orderRes.status, orderData.success);

    if (orderData.success) {
      console.log('Order ID:', orderData.data.order.id);
    } else {
      console.log('Order Error:', orderData.error);
    }

    // 5. Verify Stock & Empty Cart
    const postCartRes = await fetch('http://localhost:3000/api/cart', { headers: authHeaders });
    const postCartData = await postCartRes.json();
    console.log('Cart after checkout (should be 0):', postCartData.data.cart.items.length);

    // 6. Edge Cases
    console.log('--- EDGE CASES ---');
    
    // Invalid Product ID
    const invProdRes = await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ productId: 'invalid-id', size: '10', quantity: 1 })
    });
    console.log('Invalid Product ID Response:', invProdRes.status);

    // Empty Checkout
    // Clear cart first
    // Since we just checked out, cart is already empty
    const emptyOrderRes = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ shippingAddress: 'Nowhere' })
    });
    const emptyOrderData = await emptyOrderRes.json();
    console.log('Empty Cart Checkout Response:', emptyOrderRes.status, emptyOrderData.error);

    console.log('--- FULL E2E TEST COMPLETE ---');
  } catch (error) {
    console.error('Full E2E test failed:', error);
  }
}

testFullFlow();
