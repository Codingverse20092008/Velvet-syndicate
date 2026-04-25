import { z } from 'zod';

// ============================================================
// PHONE VALIDATION
// Supports international format: +1234567890, 1234567890, etc.
// ============================================================
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters'),
});

// ============================================================
// PRODUCT SCHEMAS
// ============================================================
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description cannot exceed 2000 characters'),
  price: z.number().positive('Price must be greater than 0'),
  imageUrl: z.string().url('Invalid URL format'),
  category: z.enum(['footwear', 'accessories', 'apparel'], {
    errorMap: () => ({ message: 'Category must be footwear, accessories, or apparel' }),
  }),
  featured: z.boolean().default(false),
  sizes: z
    .array(
      z.object({
        size: z.string().min(1, 'Size is required'),
        stock: z.number().int().min(0, 'Stock cannot be negative'),
      })
    )
    .min(1, 'At least one size is required'),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  price: z.number().positive('Price must be greater than 0').optional(),
  imageUrl: z.string().url('Invalid URL format').optional(),
  category: z.enum(['footwear', 'accessories', 'apparel']).optional(),
  featured: z.boolean().optional(),
  sizes: z
    .array(
      z.object({
        size: z.string().min(1),
        stock: z.number().int().min(0, 'Stock cannot be negative'),
      })
    )
    .optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.number().positive('Price must be greater than 0'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  isVisible: z.boolean().optional(),
  category: z.string().optional(),
  featured: z.boolean().optional(),
});

// ============================================================
// CART SCHEMAS
// ============================================================
export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().int().positive('Quantity must be positive').default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

// ============================================================
// ORDER SCHEMAS
// ============================================================
export const orderStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);

export const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50'),
});

export const orderSchema = z.object({
  userName: z.string().min(2, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format. Use format like +1234567890'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(500, 'Address cannot exceed 500 characters'),
  items: z
    .array(orderItemSchema)
    .min(1, 'Order must contain at least one item')
    .max(50, 'Order cannot exceed 50 unique items'),
});

export const createOrderSchema = z.object({
  userName: z.string().min(2, 'Name is required').max(100),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  address: z.string().min(5, 'Address is required').max(500),
});

export const shippingAddressSchema = z.object({
  shippingAddress: z.string().min(10, 'Shipping address must be at least 10 characters').max(500, 'Address cannot exceed 500 characters'),
});

// ============================================================
// STOCK MANAGEMENT SCHEMAS
// ============================================================
export const stockUpdateSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  size: z.string().min(1, 'Size is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  size: z.string().min(1, 'Size is required'),
  adjustment: z.number().int().refine(
    (val) => val !== 0,
    'Adjustment must be non-zero'
  ),
  reason: z.string().min(1, 'Reason is required').max(500),
});

// ============================================================
// ORDER STATUS UPDATE SCHEMA
// ============================================================
export const orderStatusUpdateSchema = z.object({
  status: orderStatusEnum,
});

// ============================================================
// PAGINATION SCHEMA
// ============================================================
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// ============================================================
// PRODUCT FILTERS SCHEMA
// ============================================================
export const productFiltersSchema = z.object({
  category: z.enum(['footwear', 'accessories', 'apparel']).optional(),
  featured: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  sort: z.enum(['createdAt', 'price-asc', 'price-desc', 'name']).default('createdAt'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================
// ADMIN SCHEMAS
// ============================================================
export const adminAuthSchema = z.object({
  adminSecret: z.string().min(32, 'Admin secret must be at least 32 characters'),
});

// ============================================================
// TYPE EXPORTS
// ============================================================
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type StockUpdateInput = z.infer<typeof stockUpdateSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type OrderStatusInput = z.infer<typeof orderStatusUpdateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
