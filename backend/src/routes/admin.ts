import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import { ForbiddenError } from '../lib/errors';
import {
  createAdminProduct,
  deleteAdminProduct,
  hardDeleteAdminProduct,
  getAdminOrderById,
  getAdminOrders,
  getAdminOverview,
  getAdminProducts,
  getAdminUsers,
  toggleAdminProductStock,
  updateAdminOrderStatus,
  updateAdminProduct,
} from '../services/admin.service';

// Import sub-routes
import loyaltyRoutes from './admin/loyalty';
import dashboardMetricsRoutes from './admin/metrics';
import uploadRoutes from './admin/upload';
import settingsRoutes from './admin/settings';
import collectionsRoutes from './admin/collections';
import velvetVaultRoutes from './admin/velvet-vault';
import eventsRoutes from './admin/events';

const router = Router();

// Mount sub-routes
router.use('/loyalty', loyaltyRoutes);
router.use('/metrics', dashboardMetricsRoutes);
router.use('/upload', uploadRoutes);
router.use('/settings', settingsRoutes);
router.use('/collections', collectionsRoutes);
router.use('/velvet-vault', velvetVaultRoutes);
router.use('/events', eventsRoutes);

const orderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PENDING', 'FAILED']),
});

const productCreateSchema = z.object({
  name: z.string().min(2).max(120),
  price: z.number().positive(),
  image: z.string().min(1),
  images: z.array(z.string()).default([]),
  description: z.string().min(10).max(4000),
  stock: z.number().int().min(0),
  brand: z.string().min(2).max(120),
  color: z.string().default('Default'),
  sizes: z.string().default('7,8,9,10,11,12'),
  gender: z.enum(['men', 'women', 'unisex']).default('unisex'),
  subcategory: z.enum(['casual', 'walking', 'jogging', 'running', 'sports', 'sneakers', 'streetwear']).default('sneakers'),
  featured: z.boolean().default(false),
  isOutOfStock: z.boolean().default(false),
  isOnSale: z.boolean().default(false),
  summerSale: z.boolean().default(false),
  salePercentage: z.number().int().min(0).max(100).default(0),
  salePrice: z.number().positive().optional(),
});

const productUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  price: z.number().positive().optional(),
  image: z.string().min(1).optional(),
  images: z.array(z.string()).optional(),
  description: z.string().min(10).max(4000).optional(),
  stock: z.number().int().min(0).optional(),
  brand: z.string().min(2).max(120).optional(),
  color: z.string().optional(),
  sizes: z.string().optional(),
  gender: z.enum(['men', 'women', 'unisex']).optional(),
  subcategory: z.enum(['casual', 'walking', 'jogging', 'running', 'sports', 'sneakers', 'streetwear']).optional(),
  isVisible: z.boolean().optional(),
  featured: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
  isOnSale: z.boolean().optional(),
  summerSale: z.boolean().optional(),
  salePercentage: z.number().int().min(0).max(100).optional(),
  salePrice: z.number().positive().optional(),
});

const productStockToggleSchema = z.object({
  inStock: z.boolean(),
});

async function requireAdmin(req: Request) {
  const user = await getUserFromRequest(req);
  if (user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  return user;
}

router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const overview = await getAdminOverview();
  return successResponse(res, { overview });
}));

router.get('/orders', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const orders = await getAdminOrders();
  return successResponse(res, { orders });
}));

router.get('/orders/:id', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const order = await getAdminOrderById(req.params.id);
  return successResponse(res, { order });
}));

router.patch('/orders/:id/status', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const data = orderStatusSchema.parse(req.body);
  const order = await updateAdminOrderStatus(req.params.id, data.status);
  return successResponse(res, { order, message: 'Order status updated' });
}));

router.get('/products', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const products = await getAdminProducts();
  return successResponse(res, { products });
}));

router.post('/products', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const data = productCreateSchema.parse(req.body);
  const product = await createAdminProduct(data);
  return successResponse(res, { product, message: 'Product created' }, 201);
}));

router.patch('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const data = productUpdateSchema.parse(req.body);
  const product = await updateAdminProduct(req.params.id, data);
  return successResponse(res, { product, message: 'Product updated' });
}));

router.patch('/products/:id/stock', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const data = productStockToggleSchema.parse(req.body);
  const product = await toggleAdminProductStock(req.params.id, data.inStock);
  return successResponse(res, { product, message: 'Product stock visibility updated' });
}));

router.delete('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  await deleteAdminProduct(req.params.id);
  return successResponse(res, { message: 'Product deactivated' });
}));

router.delete('/products/:id/hard', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  await hardDeleteAdminProduct(req.params.id);
  return successResponse(res, { message: 'Product permanently deleted' });
}));

router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const users = await getAdminUsers();
  return successResponse(res, { users });
}));

// GET /api/admin/users/:userId/bank-details - View customer bank details for refund
router.get('/users/:userId/bank-details', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const { db } = await import('../lib/db');
  const { users } = await import('../lib/schema');
  const { eq } = await import('drizzle-orm');
  const [user] = await db
    .select({ bankAccountNo: users.bankAccountNo, bankIfsc: users.bankIfsc, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, req.params.userId))
    .limit(1);
  if (!user) throw new (await import('../lib/errors')).NotFoundError('User');
  return successResponse(res, { bankDetails: user });
}));

// PATCH /api/admin/orders/:id/return-status - Admin approve/reject return or exchange
router.patch('/orders/:id/return-status', asyncHandler(async (req: Request, res: Response) => {
  await requireAdmin(req);
  const schema = z.object({
    returnStatus: z.enum(['RETURN_APPROVED', 'RETURN_REJECTED', 'EXCHANGE_APPROVED', 'EXCHANGE_REJECTED']),
  });
  const { returnStatus } = schema.parse(req.body);
  const { db } = await import('../lib/db');
  const { orders } = await import('../lib/schema');
  const { eq } = await import('drizzle-orm');
  await db.update(orders).set({ returnStatus: returnStatus as any, updatedAt: new Date().toISOString() }).where(eq(orders.id, req.params.id));
  const [updated] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
  return successResponse(res, { order: updated, message: `Return status updated to ${returnStatus}` });
}));

export default router;
