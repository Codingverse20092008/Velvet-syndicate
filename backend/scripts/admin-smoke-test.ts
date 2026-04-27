type JsonRecord = Record<string, any>;

const BASE_URL = process.env.ADMIN_SMOKE_BASE_URL ?? 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_SMOKE_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_SMOKE_PASSWORD;
const SHOULD_MUTATE = process.env.ADMIN_SMOKE_MUTATE === 'true';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_SMOKE_EMAIL or ADMIN_SMOKE_PASSWORD environment variables.');
  process.exit(1);
}

const cookieJar = new Map<string, string>();

function updateCookieJarFromResponse(response: Response) {
  const combined = response.headers.get('set-cookie');
  if (!combined) return;

  const matches = combined.matchAll(/(?:^|,\s*)([^=,\s]+)=([^;,\s]+)/g);
  for (const match of matches) {
    const [, key, value] = match;
    if (key && value) {
      cookieJar.set(key, value);
    }
  }
}

function getCookieHeader(): string {
  return Array.from(cookieJar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

async function request(path: string, init: RequestInit = {}): Promise<{ response: Response; data: JsonRecord }> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Content-Type', 'application/json');

  const cookieHeader = getCookieHeader();
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
  updateCookieJarFromResponse(response);

  let data: JsonRecord = {};
  try {
    data = (await response.json()) as JsonRecord;
  } catch {
    data = {};
  }

  return { response, data };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log(`Admin smoke test started against ${BASE_URL}`);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  assert(login.response.ok && login.data.success, 'Login failed for admin smoke test');
  console.log('Login OK');

  const me = await request('/api/auth/me');
  assert(me.response.ok && me.data.success, 'Failed to fetch /auth/me');
  assert(me.data.data?.user?.role === 'admin', 'Authenticated user is not admin');
  console.log('Auth identity OK');

  const overview = await request('/api/admin/overview');
  assert(overview.response.ok && overview.data.success, 'Failed to fetch /admin/overview');
  const overviewData = overview.data.data?.overview ?? {};
  assert(typeof overviewData.totalOrders === 'number', 'Overview missing totalOrders');
  assert(typeof overviewData.ordersToday === 'number', 'Overview missing ordersToday');
  assert(typeof overviewData.revenueToday === 'number', 'Overview missing revenueToday');
  console.log('Overview API OK');

  const orders = await request('/api/admin/orders');
  assert(orders.response.ok && orders.data.success, 'Failed to fetch /admin/orders');
  assert(Array.isArray(orders.data.data?.orders), 'Orders payload is not an array');
  console.log(`Orders API OK (${orders.data.data.orders.length} orders)`);

  const products = await request('/api/admin/products');
  assert(products.response.ok && products.data.success, 'Failed to fetch /admin/products');
  assert(Array.isArray(products.data.data?.products), 'Products payload is not an array');
  console.log(`Products API OK (${products.data.data.products.length} products)`);

  if (SHOULD_MUTATE) {
    const suffix = Date.now();
    const create = await request('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        name: `Smoke Test Product ${suffix}`,
        price: 4999,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200',
        description: 'Temporary smoke-test product used to verify admin create/deactivate flow.',
        stock: 3,
        brand: 'SmokeTest',
      }),
    });
    assert(create.response.ok && create.data.success, 'Failed to create smoke test product');
    const productId = create.data.data?.product?.id as string;
    assert(Boolean(productId), 'Created product missing ID');
    console.log('Create product API OK');

    const deactivate = await request(`/api/admin/products/${productId}`, {
      method: 'DELETE',
    });
    assert(deactivate.response.ok && deactivate.data.success, 'Failed to deactivate smoke test product');
    console.log('Soft delete API OK');

    const afterDeactivate = await request('/api/admin/products');
    const product = (afterDeactivate.data.data?.products ?? []).find((p: JsonRecord) => p.id === productId);
    assert(product && product.isVisible === false, 'Deactivated product is still visible');
    console.log('Deactivation state verification OK');
  } else {
    console.log('Mutation checks skipped (set ADMIN_SMOKE_MUTATE=true to include create/deactivate checks).');
  }

  console.log('Admin smoke test passed.');
}

run().catch((error) => {
  console.error('Admin smoke test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
