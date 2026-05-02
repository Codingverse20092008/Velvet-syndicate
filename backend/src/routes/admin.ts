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

const router = Router();

// Mount sub-routes
router.use('/loyalty', loyaltyRoutes);
router.use('/metrics', dashboardMetricsRoutes);
router.use('/upload', uploadRoutes);
router.use('/settings', settingsRoutes);
router.use('/collections', collectionsRoutes);

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
  subcategory: z.enum(['casual', 'walking', 'jogging', 'running', 'sports', 'sneakers']).default('sneakers'),
  featured: z.boolean().default(false),
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
  subcategory: z.enum(['casual', 'walking', 'jogging', 'running', 'sports', 'sneakers']).optional(),
  isVisible: z.boolean().optional(),
  featured: z.boolean().optional(),
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

export default router;
