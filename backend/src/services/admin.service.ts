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
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { logger } from '../lib/logger';
import crypto from 'node:crypto';
import { invalidateProductsCache } from '../lib/cache';

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
  itemsSummary?: string;
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
  color?: string | null;
  sizes?: string | null;
  gender?: string | null;
  subcategory?: string | null;
  featured?: boolean;
  isOutOfStock?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  salePrice?: number | null;
  summerSale?: boolean;
  isNew?: boolean;
  isExclusive?: boolean;
  hasXPBonus?: boolean;
  sizesWithStock?: Array<{ size: string; stock: number }>;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalOrders: number;
  createdAt: string;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
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
    itemsSummary: record.items?.map((i: any) => i.productName).join(', ') || '',
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

function resolveSaleFields(input: {
  currentPrice: number;
  price?: number;
  salePrice?: number;
  isOnSale?: boolean;
  salePercentage?: number;
}) {
  const effectivePrice = input.price ?? input.currentPrice;
  const requestedSalePrice = input.salePrice;

  if (
    requestedSalePrice !== undefined &&
    Number.isFinite(requestedSalePrice) &&
    requestedSalePrice > 0 &&
    requestedSalePrice < effectivePrice
  ) {
    const pct = Math.max(1, Math.min(99, Math.round(((effectivePrice - requestedSalePrice) / effectivePrice) * 100)));
    return {
      isOnSale: true,
      salePercentage: pct,
      salePrice: Math.round(requestedSalePrice),
    };
  }

  const pct = Math.max(0, Math.min(100, Math.round(input.salePercentage ?? 0)));
  const onSale = Boolean(input.isOnSale ?? pct > 0);
  if (!onSale || pct <= 0) {
    return {
      isOnSale: false,
      salePercentage: 0,
      salePrice: null,
    };
  }

  return {
    isOnSale: true,
    salePercentage: pct,
    salePrice: Math.max(0, Math.round(effectivePrice * (1 - pct / 100))),
  };
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
    with: { user: true, items: true },
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
        p.gender,
        p.product_type as subcategory,
        p.featured,
        p.is_out_of_stock as isOutOfStock,
        p.is_on_sale as isOnSale,
        p.is_summer_sale as summerSale,
        p.sale_percentage as salePercentage,
        p.is_new as isNew,
        p.is_exclusive as isExclusive,
        p.has_xp_bonus as hasXPBonus,
        COALESCE(GROUP_CONCAT(DISTINCT pv.color), '') as color,
        COALESCE(GROUP_CONCAT(DISTINCT ps.size), '') as sizes,
        COALESCE(SUM(ps.stock), 0) as stock
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN product_sizes ps ON ps.variant_id = pv.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `,
    args: [],
  });

  const sizesResult = await dbClient.execute({
    sql: `
      SELECT pv.product_id, ps.size, ps.stock
      FROM product_sizes ps
      JOIN product_variants pv ON pv.id = ps.variant_id
    `,
    args: [],
  });

  const sizesByProduct = new Map<string, Array<{ size: string; stock: number }>>();
  for (const r of sizesResult.rows as any[]) {
    const list = sizesByProduct.get(r.product_id) || [];
    list.push({ size: String(r.size), stock: Number(r.stock ?? 0) });
    sizesByProduct.set(r.product_id, list);
  }

  return (result.rows as any[]).map((row) => {
    const mainImage = row.imageUrl || row.image_url || '';
    const sizesWithStock = (sizesByProduct.get(row.id) || []).sort((a, b) => {
      const numA = parseFloat(a.size);
      const numB = parseFloat(b.size);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.size.localeCompare(b.size);
    });
    const calculatedStock = sizesWithStock.length > 0
      ? sizesWithStock.reduce((acc, s) => acc + s.stock, 0)
      : Number(row.stock || 0);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: row.price,
      image: mainImage,
      imageUrl: mainImage,
      brand: row.brand,
      stock: calculatedStock,
      sizesWithStock,
      isVisible: Boolean(row.isVisible),
      createdAt: row.createdAt,
      color: row.color,
      sizes: sizesWithStock.length > 0 ? sizesWithStock.map(s => s.size).join(',') : row.sizes,
      gender: row.gender,
      subcategory: row.subcategory,
      featured: Boolean(row.featured),
      isOutOfStock: Boolean(row.isOutOfStock) || calculatedStock === 0,
      isOnSale: Boolean(row.isOnSale),
      summerSale: Boolean(row.summerSale),
      salePercentage: row.salePercentage,
      isNew: Boolean(row.isNew),
      isExclusive: Boolean(row.isExclusive),
      hasXPBonus: Boolean(row.hasXPBonus),
      salePrice: Boolean(row.isOnSale) && Number(row.salePercentage || 0) > 0
        ? Math.max(0, Math.round(Number(row.price) * (1 - Number(row.salePercentage || 0) / 100)))
        : null,
    };
  });
}

export async function createAdminProduct(data: {
  name: string;
  price: number;
  image: string;
  images: string[];
  description: string;
  stock: number;
  brand: string;
  color: string;
  sizes: string;
  gender: string;
  subcategory: string;
  featured: boolean;
  isOutOfStock: boolean;
  isOnSale: boolean;
  salePercentage: number;
  salePrice?: number;
  summerSale: boolean;
  isNew?: boolean;
  isExclusive?: boolean;
  hasXPBonus?: boolean;
  sizesWithStock?: Array<{ size: string; stock: number }>;
}): Promise<AdminProductItem> {
  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const slug = await generateUniqueSlug(data.name);

  const hasPerSizeStock = Array.isArray(data.sizesWithStock) && data.sizesWithStock.length > 0;
  const calculatedStock = hasPerSizeStock
    ? data.sizesWithStock!.reduce((acc, s) => acc + s.stock, 0)
    : data.stock;
  const computedOutOfStock = data.isOutOfStock || calculatedStock === 0;

  // Parse sizes (comma-separated like "7,8,9,10,11,12")
  const sizeList = hasPerSizeStock
    ? data.sizesWithStock!.map(s => s.size)
    : (data.sizes
      ? data.sizes.split(',').map(s => s.trim()).filter(s => s)
      : []);
  if (sizeList.length === 0) sizeList.push('Standard');

  // Calculate stock per size (divide total stock evenly if distributed)
  const stockPerSize = sizeList.length > 0 ? Math.floor(calculatedStock / sizeList.length) : 0;
  const remainderStock = sizeList.length > 0 ? calculatedStock - (stockPerSize * sizeList.length) : 0;
  const saleFields = resolveSaleFields({
    currentPrice: data.price,
    price: data.price,
    salePrice: data.salePrice,
    isOnSale: data.isOnSale,
    salePercentage: data.salePercentage,
  });

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
      gender: data.gender || 'unisex',
      productType: data.subcategory || 'sneakers',
      featured: data.featured || false,
      isOutOfStock: computedOutOfStock,
      isOnSale: saleFields.isOnSale,
      isSummerSale: data.summerSale || false,
      salePercentage: saleFields.salePercentage,
      isNew: data.isNew || false,
      isExclusive: data.isExclusive || false,
      hasXPBonus: data.hasXPBonus || false,
      isVisible: true,
    });

    await tx.insert(productVariants).values({
      id: variantId,
      productId,
      name: data.color || 'Standard',
      color: data.color || '#808080',
      slug,
    });

    // Insert primary image
    await tx.insert(productVariantImages).values({
      id: crypto.randomUUID(),
      variantId,
      imageUrl: data.image,
    });

    // Insert additional images
    for (const imgUrl of data.images || []) {
      await tx.insert(productVariantImages).values({
        id: crypto.randomUUID(),
        variantId,
        imageUrl: imgUrl,
      });
    }

    // Insert sizes with exact per-size stock or distributed stock
    if (hasPerSizeStock) {
      for (const item of data.sizesWithStock!) {
        await tx.insert(productSizes).values({
          id: crypto.randomUUID(),
          variantId,
          size: item.size,
          stock: item.stock,
        });
      }
    } else {
      for (let index = 0; index < sizeList.length; index++) {
        const size = sizeList[index];
        const sizeStock = stockPerSize + (index < remainderStock ? 1 : 0);
        await tx.insert(productSizes).values({
          id: crypto.randomUUID(),
          variantId,
          size: size,
          stock: sizeStock,
        });
      }
    }
  });

  // Invalidate cache after product creation
  await invalidateProductsCache();
  logger.info({ productId }, 'CACHE_INVALIDATED:product_created');

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
    images: string[];
    description: string;
    stock: number;
    brand: string;
    color: string;
    sizes: string;
    gender: string;
    subcategory: string;
    isVisible: boolean;
    featured: boolean;
    isOutOfStock: boolean;
    isOnSale: boolean;
    salePercentage: number;
    salePrice: number;
    summerSale: boolean;
    isNew?: boolean;
    isExclusive?: boolean;
    hasXPBonus?: boolean;
    sizesWithStock?: Array<{ size: string; stock: number }>;
  }>
): Promise<AdminProductItem> {
  const existing = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true, slug: true, price: true, isOnSale: true, salePercentage: true },
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
    if (data.gender !== undefined) patch.gender = data.gender;
    if (data.subcategory !== undefined) patch.productType = data.subcategory;
    if (data.isVisible !== undefined) patch.isVisible = data.isVisible;
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.isOutOfStock !== undefined) patch.isOutOfStock = data.isOutOfStock;
    if (data.summerSale !== undefined) patch.isSummerSale = data.summerSale;
    if (data.isNew !== undefined) patch.isNew = data.isNew;
    if (data.isExclusive !== undefined) patch.isExclusive = data.isExclusive;
    if (data.hasXPBonus !== undefined) patch.hasXPBonus = data.hasXPBonus;
    // Summer sale products should be immediately discoverable on customer listing pages.
    // If admin enables summer sale and doesn't explicitly set visibility, auto-activate it.
    if (data.summerSale === true && data.isVisible === undefined) {
      patch.isVisible = true;
    }

    if (
      data.price !== undefined ||
      data.salePrice !== undefined ||
      data.isOnSale !== undefined ||
      data.salePercentage !== undefined
    ) {
      const saleFields = resolveSaleFields({
        currentPrice: Number(existing.price ?? 0),
        price: data.price,
        salePrice: data.salePrice,
        isOnSale: data.isOnSale ?? Boolean(existing.isOnSale),
        salePercentage: data.salePercentage ?? Number(existing.salePercentage ?? 0),
      });
      patch.isOnSale = saleFields.isOnSale;
      patch.salePercentage = saleFields.salePercentage;
    }

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
          name: data.color || 'Standard',
          color: data.color || '#808080',
          slug: existing.slug,
        });
        await tx.insert(productVariantImages).values({
          id: crypto.randomUUID(),
          variantId,
          imageUrl: data.image,
        });
      } else {
        const firstVariantId = variants[0].id;
        // Delete existing images for this variant
        await tx.delete(productVariantImages).where(eq(productVariantImages.variantId, firstVariantId));
        // Insert primary image
        await tx.insert(productVariantImages).values({
          id: crypto.randomUUID(),
          variantId: firstVariantId,
          imageUrl: data.image,
        });
        // Insert additional images
        for (const imgUrl of data.images || []) {
          await tx.insert(productVariantImages).values({
            id: crypto.randomUUID(),
            variantId: firstVariantId,
            imageUrl: imgUrl,
          });
        }
      }
    }

    if (data.color !== undefined && variants.length > 0) {
      await tx.update(productVariants).set({ 
        name: data.color,
        color: data.color 
      }).where(eq(productVariants.id, variants[0].id));
    }

    // Handle sizes and stock update
    if (data.sizesWithStock !== undefined && data.sizesWithStock.length > 0) {
      let variantIds = variants.map((variant) => variant.id);
      if (variantIds.length === 0) {
        const variantId = crypto.randomUUID();
        await tx.insert(productVariants).values({
          id: variantId,
          productId,
          name: data.color || 'Standard',
          color: data.color || '#808080',
          slug: existing.slug,
        });
        variantIds = [variantId];
      }

      const firstVariantId = variantIds[0];

      // Delete existing sizes for this variant
      await tx.delete(productSizes).where(eq(productSizes.variantId, firstVariantId));

      // Insert new sizes with exact per-size stock
      for (const item of data.sizesWithStock) {
        await tx.insert(productSizes).values({
          id: crypto.randomUUID(),
          variantId: firstVariantId,
          size: item.size,
          stock: item.stock,
        });
      }

      const totalSizeStock = data.sizesWithStock.reduce((acc, s) => acc + s.stock, 0);
      if (data.isOutOfStock === undefined) {
        await tx.update(products).set({ isOutOfStock: totalSizeStock === 0 }).where(eq(products.id, productId));
      }
    } else if (data.stock !== undefined || data.sizes !== undefined) {
      let variantIds = variants.map((variant) => variant.id);
      if (variantIds.length === 0) {
        const variantId = crypto.randomUUID();
        await tx.insert(productVariants).values({
          id: variantId,
          productId,
          name: data.color || 'Standard',
          color: data.color || '#808080',
          slug: existing.slug,
        });
        variantIds = [variantId];
      }

      const firstVariantId = variantIds[0];

      // Parse sizes if provided, otherwise use existing sizes
      let sizeList: string[];
      if (data.sizes !== undefined) {
        if (data.sizes === '') {
          sizeList = ['Standard'];
        } else {
          sizeList = data.sizes.split(',').map(s => s.trim()).filter(s => s);
          if (sizeList.length === 0) sizeList = ['Standard'];
        }
      } else {
        // Get existing sizes
        const existingSizes = await tx.query.productSizes.findMany({
          where: eq(productSizes.variantId, firstVariantId),
          columns: { size: true },
        });
        sizeList = existingSizes.map(s => s.size);
        if (sizeList.length === 0) {
          sizeList = ['Standard'];
        }
      }

      const existingSizeRows = await tx.query.productSizes.findMany({
        where: eq(productSizes.variantId, firstVariantId),
        columns: { stock: true },
      });
      const existingTotalStock = existingSizeRows.reduce((sum, row) => sum + Number(row.stock ?? 0), 0);

      // Delete existing sizes for this variant
      await tx.delete(productSizes).where(eq(productSizes.variantId, firstVariantId));

      // Calculate stock per size. Preserve existing stock when caller does not send stock.
      const totalStock = data.stock ?? existingTotalStock;
      const stockPerSize = sizeList.length > 0 ? Math.floor(totalStock / sizeList.length) : 0;
      const remainderStock = sizeList.length > 0 ? totalStock - (stockPerSize * sizeList.length) : 0;

      // Insert new sizes with distributed stock
      for (let i = 0; i < sizeList.length; i++) {
        const sizeStock = stockPerSize + (i < remainderStock ? 1 : 0);
        await tx.insert(productSizes).values({
          id: crypto.randomUUID(),
          variantId: firstVariantId,
          size: sizeList[i],
          stock: sizeStock,
        });
      }
    }
  });

  // Invalidate cache after product update
  await invalidateProductsCache();
  logger.info({ productId }, 'CACHE_INVALIDATED:product_updated');

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

  // Invalidate cache after product deletion
  await invalidateProductsCache();
  logger.info({ productId }, 'CACHE_INVALIDATED:product_deleted');
}

export async function hardDeleteAdminProduct(productId: string): Promise<void> {
  const existing = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true },
  });
  if (!existing) throw new NotFoundError('Product');

  try {
    await db.delete(products).where(eq(products.id, productId));
    await invalidateProductsCache();
    logger.info({ productId }, 'product_hard_deleted');
  } catch (error: any) {
    if (error.message?.includes('FOREIGN KEY constraint failed')) {
      throw new ConflictError('Cannot delete this product because it is linked to existing orders. Please deactivate it instead to preserve order history.');
    }
    throw error;
  }
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
