import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { addToCartSchema, updateCartItemSchema } from '../lib/schemas';
import { 
  addToCart, 
  getCartWithItems, 
  removeFromCart, 
  updateCartItemQuantity,
  saveAbandonedCart,
  getAbandonedCarts,
  markCartRecovered
} from '../services/cart.service';
import { getUserFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { ValidationError } from '../lib/errors';
import { successResponse } from '../lib/api-response-express';

const router = Router();

// GET /api/cart
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const cartData = await getCartWithItems(user.id);

  return successResponse(res, {
    cart: {
      ...cartData,
      itemCount: cartData.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
    }
  });
}));

// POST /api/cart
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const body = req.body;
  const { productId, variantId, size, quantity } = addToCartSchema.parse(body);

  await addToCart(user.id, productId, variantId, size, quantity);

  return successResponse(res, { message: 'Item added to cart' }, 201);
}));

// PATCH /api/cart
router.patch('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const body = req.body;

  const { itemId, productId, variantId, size, quantity } = req.body;
  
  let targetItemId = itemId;

  if (!targetItemId && productId && variantId && size) {
    const cartData = await getCartWithItems(user.id);
    const item = cartData.items.find((i: any) => 
      i.productId === productId && i.variantId === variantId && i.size === size
    );
    if (item) targetItemId = item.id;
  }

  if (!targetItemId) throw new ValidationError('Item ID or product identifiers required');

  const parsed = updateCartItemSchema.parse({ quantity });
  await updateCartItemQuantity(user.id, targetItemId, parsed.quantity);

  return successResponse(res, { message: 'Cart updated' });
}));

// DELETE /api/cart
router.delete('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const itemId = req.query.itemId as string;
  const { productId, variantId, size } = req.query;

  if (itemId) {
    await removeFromCart(user.id, itemId);
  } else if (productId && variantId && size) {
    // Optional: find by properties if itemId not provided
    const cartData = await getCartWithItems(user.id);
    const item = cartData.items.find((i: any) => 
      i.productId === productId && i.variantId === variantId && i.size === size
    );
    if (item) await removeFromCart(user.id, item.id);
  } else {
    throw new ValidationError('Item ID or product/variant/size required');
  }

  return successResponse(res, { message: 'Item removed from cart' });
}));

const abandonedCartInputSchema = z.object({
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  items: z.array(z.any()).default([]),
  totalAmount: z.number().nonnegative().default(0),
  recovered: z.boolean().default(false),
});

// POST /api/cart/abandoned - Debounced sync from checkout
router.post('/abandoned', asyncHandler(async (req: Request, res: Response) => {
  const parsed = abandonedCartInputSchema.parse(req.body);
  const result = await saveAbandonedCart(parsed);
  return successResponse(res, { success: true, ...result });
}));

// GET /api/cart/abandoned - List abandoned carts for admin/recovery
router.get('/abandoned', asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const leads = await getAbandonedCarts({ limit, offset });
  return successResponse(res, { leads });
}));

// PATCH /api/cart/abandoned/:id/recovered - Mark recovery status
router.patch('/abandoned/:id/recovered', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const recovered = req.body.recovered !== false;
  await markCartRecovered(id, recovered);
  return successResponse(res, { message: 'Cart recovery status updated' });
}));

export default router;
