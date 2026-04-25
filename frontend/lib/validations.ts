import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.number().positive("Price must be greater than 0"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  isVisible: z.boolean().optional(),
  category: z.string().optional(),
  featured: z.boolean().optional(),
});

export const orderSchema = z.object({
  userName: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  items: z.array(z.object({
    productId: z.string().uuid(),
    size: z.string(),
    quantity: z.number().int().positive(),
  })).min(1, "Order must contain at least one item"),
});

export const stockUpdateSchema = z.object({
  productId: z.string().uuid(),
  size: z.string(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
});

export const orderStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);

export const paginationSchema = z.object({
  page: z.string().optional().transform(v => parseInt(v || '1')),
  limit: z.string().optional().transform(v => parseInt(v || '10')),
});
