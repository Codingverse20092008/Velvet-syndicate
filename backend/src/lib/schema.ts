import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  userAgent: text('user_agent'),
  ip: text('ip'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  price: real('price').notNull(),
  imageUrl: text('image_url').notNull(),
  brand: text('brand').notNull().default('Velvet'),
  category: text('category').notNull().default('footwear'),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  features: text('features'),
  careInstructions: text('care_instructions'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
  brandIdx: index('products_brand_idx').on(table.brand),
  categoryIdx: index('products_category_idx').on(table.category),
  featuredIdx: index('products_featured_idx').on(table.featured),
}));

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  slug: text('slug'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  productIdIdx: index('product_variants_product_id_idx').on(table.productId),
}));

export const productVariantImages = sqliteTable('product_variant_images', {
  id: text('id').primaryKey(),
  variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
}, (table) => ({
  variantIdIdx: index('product_variant_images_variant_id_idx').on(table.variantId),
}));

export const productSizes = sqliteTable('product_sizes', {
  id: text('id').primaryKey(),
  variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  size: text('size').notNull(),
  stock: integer('stock').notNull().default(0),
}, (table) => ({
  variantIdIdx: index('product_sizes_variant_id_idx').on(table.variantId),
  variantSizeIdx: uniqueIndex('product_sizes_unique_idx').on(table.variantId, table.size),
}));

export const cart = sqliteTable('cart', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('cart_user_id_idx').on(table.userId),
}));

export const cartItems = sqliteTable('cart_items', {
  id: text('id').primaryKey(),
  cartId: text('cart_id').notNull().references(() => cart.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  variantId: text('variant_id').notNull().references(() => productVariants.id),
  size: text('size').notNull(),
  quantity: integer('quantity').notNull().default(1),
}, (table) => ({
  cartIdIdx: index('cart_items_cart_id_idx').on(table.cartId),
  uniqueCartItemIdx: uniqueIndex('cart_items_unique_idx').on(table.cartId, table.productId, table.variantId, table.size),
}));


export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  total: real('total').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] }).notNull().default('pending'),
  paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'failed', 'refunded'] }).notNull().default('pending'),
  shippingAddress: text('shipping_address'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('orders_user_id_idx').on(table.userId),
  statusIdx: index('orders_status_idx').on(table.status),
}));

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  productPrice: real('product_price').notNull(),
  quantity: integer('quantity').notNull(),
  size: text('size').notNull(),
}, (table) => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  cart: one(cart, { fields: [users.id], references: [cart.userId] }),
  orders: many(orders),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  images: many(productVariantImages),
  sizes: many(productSizes),
  cartItems: many(cartItems),
}));

export const productVariantImagesRelations = relations(productVariantImages, ({ one }) => ({
  variant: one(productVariants, { fields: [productVariantImages.variantId], references: [productVariants.id] }),
}));

export const productSizesRelations = relations(productSizes, ({ one }) => ({
  variant: one(productVariants, { fields: [productSizes.variantId], references: [productVariants.id] }),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(users, { fields: [cart.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(cart, { fields: [cartItems.cartId], references: [cart.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductVariantImage = typeof productVariantImages.$inferSelect;
export type ProductSize = typeof productSizes.$inferSelect;
export type Cart = typeof cart.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;