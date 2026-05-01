import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import * as collectionService from '../../services/collection.service';
import { z } from 'zod';

const router = Router();

// Admin middleware
const requireAdmin = async (req: Request, res: Response): Promise<boolean> => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user as any).role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
};

const collectionSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  productIds: z.array(z.string()).optional(),
});

// GET /api/admin/collections
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const collections = await collectionService.getAdminCollections();
  return successResponse(res, { collections });
}));

// POST /api/admin/collections
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const data = collectionSchema.parse(req.body);
  const id = await collectionService.createCollection(data);
  return successResponse(res, { id, message: 'Collection created' });
}));

// PATCH /api/admin/collections/:id
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const data = collectionSchema.partial().extend({ isVisible: z.boolean().optional() }).parse(req.body);
  await collectionService.updateCollection(req.params.id, data);
  return successResponse(res, { message: 'Collection updated' });
}));

// DELETE /api/admin/collections/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  await collectionService.deleteCollection(req.params.id);
  return successResponse(res, { message: 'Collection deleted' });
}));

// GET /api/admin/collections/:id/products
router.get('/:id/products', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const products = await collectionService.getCollectionProducts(req.params.id);
  return successResponse(res, { products });
}));

export default router;
