import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db, dbClient } from '../lib/db';
import {
  orderItems,
  orders,
  productSizes,
  productVariantImages,
  productVariants,
  products,
  users,
} from '../lib/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { logger } from '../lib/logger';

type AdminOrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED';

interface AddressSnapshot {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AdminOverview {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  ordersToday: number;
  revenueToday: number;
  recentOrders: AdminOrderListItem[];
}

export interface AdminOrderListItem {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  addressSnapshot: AddressSnapshot;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: AdminOrderStatus;
  createdAt: string;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    size: string;
    variantId: string | null;
    imageUrl: string | null;
  }>;
}

export interface AdminProductItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  brand: string;
  stock: number;
  isVisible: boolean;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalOrders: number;
  createdAt: string;
}

const STATUS_TRANSITIONS: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

function parseAddressSnapshot(value: string): AddressSnapshot {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mapOrderRecord(record: any): AdminOrderListItem {
  const snapshot = parseAddressSnapshot(record.shippingAddress);
  return {
    id: record.id,
    userId: record.userId,
    customerName: snapshot.name || record.user?.name || 'Customer',
    phone: snapshot.phone || record.user?.phone || '',
    addressSnapshot: snapshot,
    total: Number(record.totalAmount ?? 0),
    paymentMethod: record.paymentMethod,
    paymentStatus: record.paymentStatus,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = slugify(baseName) || `product-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.query.products.findFirst({
      where: eq(products.slug, slug),
      columns: { id: true },
    });

    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const [totals] = await db
    .select({
      totalOrders: sql<number>`count(*)`,
      totalRevenue: sql<number>`coalesce(sum(case when ${orders.status} in ('CONFIRMED','SHIPPED','DELIVERED') then ${orders.totalAmount} else 0 end), 0)`,
      pendingOrders: sql<number>`coalesce(sum(case when ${orders.status} in ('PENDING','CONFIRMED') then 1 else 0 end), 0)`,
    })
    .from(orders);

  const [todayTotals] = await db
    .select({
      ordersToday: sql<number>`count(*)`,
      revenueToday: sql<number>`coalesce(sum(case when ${orders.status} in ('CONFIRMED','SHIPPED','DELIVERED') then ${orders.totalAmount} else 0 end), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, dayStart.toISOString()),
        lt(orders.createdAt, nextDayStart.toISOString())
      )
    );

  const recentOrdersRaw = await db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    limit: 5,
    with: { user: true },
  });

  return {
    totalOrders: Number(totals?.totalOrders ?? 0),
    totalRevenue: Number(totals?.totalRevenue ?? 0),
    pendingOrders: Number(totals?.pendingOrders ?? 0),
    ordersToday: Number(todayTotals?.ordersToday ?? 0),
    revenueToday: Number(todayTotals?.revenueToday ?? 0),
    recentOrders: recentOrdersRaw.map(mapOrderRecord),
  };
}

export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const rows = await db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    with: { user: true },
  });

  return rows.map(mapOrderRecord);
}

export async function getAdminOrderById(orderId: string): Promise<AdminOrderDetail> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { user: true, items: true },
  });

  if (!order) throw new NotFoundError('Order');

  return {
    ...mapOrderRecord(order),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productPrice: Number(item.productPrice),
      quantity: item.quantity,
      size: item.size,
      variantId: item.variantId ?? null,
      imageUrl: item.imageUrl ?? null,
    })),
  };
}

export async function updateAdminOrderStatus(orderId: string, newStatus: AdminOrderStatus): Promise<AdminOrderDetail> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { user: true, items: true },
  });

  if (!order) throw new NotFoundError('Order');

  const currentStatus = order.status as AdminOrderStatus;
  const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new ValidationError(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  await db
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date().toISOString() })
    .where(eq(orders.id, orderId));

  logger.info({ orderId, newStatus }, 'orderStatusUpdated');
  return getAdminOrderById(orderId);
}

export async function getAdminProducts(): Promise<AdminProductItem[]> {
  const result = await dbClient.execute({
    sql: `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.image_url as imageUrl,
        p.brand,
        p.is_visible as isVisible,
        p.created_at as createdAt,
        COALESCE(SUM(ps.stock), 0) as stock
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN product_sizes ps ON ps.variant_id = pv.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `,
    args: [],
  });

  return (result.rows as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price ?? 0),
    image: row.imageUrl,
    brand: row.brand,
    stock: Number(row.stock ?? 0),
    isVisible: Boolean(row.isVisible),
    createdAt: row.createdAt,
  }));
}

export async function createAdminProduct(data: {
  name: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  brand: string;
}): Promise<AdminProductItem> {
  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const sizeId = crypto.randomUUID();
  const imageId = crypto.randomUUID();
  const slug = await generateUniqueSlug(data.name);

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id: productId,
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      imageUrl: data.image,
      brand: data.brand,
      category: 'footwear',
      featured: false,
      isVisible: true,
    });

    await tx.insert(productVariants).values({
      id: variantId,
      productId,
      name: 'Standard',
      color: 'Default',
      slug,
    });

    await tx.insert(productVariantImages).values({
      id: imageId,
      variantId,
      imageUrl: data.image,
    });

    await tx.insert(productSizes).values({
      id: sizeId,
      variantId,
      size: '8',
      stock: data.stock,
    });
  });

  const all = await getAdminProducts();
  const created = all.find((product) => product.id === productId);
  if (!created) throw new NotFoundError('Product');
  return created;
}

export async function updateAdminProduct(
  productId: string,
  data: Partial<{
    name: string;
    price: number;
    image: string;
    description: string;
    stock: number;
    brand: string;
    isVisible: boolean;
  }>
): Promise<AdminProductItem> {
  const existing = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true, slug: true },
  });
  if (!existing) throw new NotFoundError('Product');

  await db.transaction(async (tx) => {
    const patch: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) patch.name = data.name;
    if (data.price !== undefined) patch.price = data.price;
    if (data.description !== undefined) patch.description = data.description;
    if (data.image !== undefined) patch.imageUrl = data.image;
    if (data.brand !== undefined) patch.brand = data.brand;
    if (data.isVisible !== undefined) patch.isVisible = data.isVisible;

    if (data.name) {
      patch.slug = await generateUniqueSlug(data.name);
    }

    await tx.update(products).set(patch).where(eq(products.id, productId));

    const variants = await tx.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
      columns: { id: true },
    });

    if (data.image !== undefined) {
      if (variants.length === 0) {
        const variantId = crypto.randomUUID();
        await tx.insert(productVariants).values({
          id: variantId,
          productId,
          name: 'Standard',
          color: 'Default',
          slug: existing.slug,
        });
        await tx.insert(productVariantImages).values({
          id: crypto.randomUUID(),
          variantId,
          imageUrl: data.image,
        });
      } else {
        const firstVariantId = variants[0].id;
        const existingImage = await tx.query.productVariantImages.findFirst({
          where: eq(productVariantImages.variantId, firstVariantId),
          columns: { id: true },
        });

        if (existingImage) {
          await tx
            .update(productVariantImages)
            .set({ imageUrl: data.image })
            .where(eq(productVariantImages.id, existingImage.id));
        } else {
          await tx.insert(productVariantImages).values({
            id: crypto.randomUUID(),
            variantId: firstVariantId,
            imageUrl: data.image,
          });
        }
      }
    }

    if (data.stock !== undefined) {
      let variantIds = variants.map((variant) => variant.id);
      if (variantIds.length === 0) {
        const variantId = crypto.randomUUID();
        await tx.insert(productVariants).values({
          id: variantId,
          productId,
          name: 'Standard',
          color: 'Default',
          slug: existing.slug,
        });
        variantIds = [variantId];
      }

      await tx
        .update(productSizes)
        .set({ stock: 0 })
        .where(inArray(productSizes.variantId, variantIds));

      const firstVariantId = variantIds[0];
      const firstSize = await tx.query.productSizes.findFirst({
        where: eq(productSizes.variantId, firstVariantId),
        columns: { id: true },
      });

      if (firstSize) {
        await tx
          .update(productSizes)
          .set({ stock: data.stock })
          .where(eq(productSizes.id, firstSize.id));
      } else {
        await tx.insert(productSizes).values({
          id: crypto.randomUUID(),
          variantId: firstVariantId,
          size: '8',
          stock: data.stock,
        });
      }
    }
  });

  const all = await getAdminProducts();
  const updated = all.find((product) => product.id === productId);
  if (!updated) throw new NotFoundError('Product');
  return updated;
}

export async function deleteAdminProduct(productId: string): Promise<void> {
  const existing = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true },
  });
  if (!existing) throw new NotFoundError('Product');

  await db
    .update(products)
    .set({
      isVisible: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId));
}

export async function toggleAdminProductStock(productId: string, inStock: boolean): Promise<AdminProductItem> {
  return updateAdminProduct(productId, { isVisible: inStock });
}

export async function getAdminUsers(): Promise<AdminUserItem[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      totalOrders: sql<number>`count(${orders.id})`,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(orders, eq(users.id, orders.userId))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    totalOrders: Number(row.totalOrders ?? 0),
    createdAt: row.createdAt,
  }));
}
