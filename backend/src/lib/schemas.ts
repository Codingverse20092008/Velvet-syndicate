import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(2000),
  price: z.number().positive(),
  imageUrl: z.string().url(),
  category: z.enum(['footwear', 'accessories', 'apparel']),
  featured: z.boolean().default(false),
  sizes: z.array(z.object({
    size: z.string().min(1),
    stock: z.number().int().min(0),
  })).min(1),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
  category: z.enum(['footwear', 'accessories', 'apparel']).optional(),
  featured: z.boolean().optional(),
  sizes: z.array(z.object({
    size: z.string().min(1),
    stock: z.number().int().min(0),
  })).optional(),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  size: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
});

export const createOrderSchema = z.object({
  shippingAddress: z.string().min(10).max(500),
});

export const productFiltersSchema = z.object({
  category: z.enum(['footwear', 'accessories', 'apparel']).optional(),
  featured: z.enum(['true', 'false']).optional().transform((v) =>
    v === 'true' ? true : v === 'false' ? false : undefined
  ),
  sort: z.enum(['createdAt', 'price-asc', 'price-desc', 'name']).default('createdAt'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  // Free-text search — validated: trimmed, max 100 chars, no injection surface
  search: z.string().trim().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;