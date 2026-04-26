import { Router, Request, Response } from 'express';
import { addToCartSchema, updateCartItemSchema } from '../lib/schemas';
import { addToCart, getCartWithItems, removeFromCart, updateCartItemQuantity } from '../services/cart.service';
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

  const itemId = body.itemId;
  if (!itemId) throw new ValidationError('Item ID is required');

  const { quantity } = updateCartItemSchema.parse(body);

  await updateCartItemQuantity(user.id, itemId, quantity);

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


export default router;
