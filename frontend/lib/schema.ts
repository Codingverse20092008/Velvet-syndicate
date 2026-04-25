import { sqliteTable, text, integer, real, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
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
  slug: text('slug').notNull(),
  description: text('description').notNull(),
  price: real('price').notNull(),
  imageUrl: text('image_url').notNull(),
  category: text('category').notNull().default('footwear'),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
  categoryIdx: index('products_category_idx').on(table.category),
  featuredIdx: index('products_featured_idx').on(table.featured),
  isVisibleIdx: index('products_is_visible_idx').on(table.isVisible),
  // Price must be positive (SQLite CHECK constraint)
  priceCheck: check('price_check', sql`${table.price} > 0`),
}));

export const productSizes = sqliteTable('product_sizes', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  size: text('size').notNull(),
  stock: integer('stock').notNull().default(0),
}, (table) => ({
  productIdIdx: index('product_sizes_product_id_idx').on(table.productId),
  productSizeIdx: uniqueIndex('product_sizes_unique_idx').on(table.productId, table.size),
  // Prevent negative stock at DB level (SQLite CHECK constraint)
  stockCheck: check('stock_check', sql`${table.stock} >= 0`),
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
  size: text('size').notNull(),
  quantity: integer('quantity').notNull().default(1),
}, (table) => ({
  cartIdIdx: index('cart_items_cart_id_idx').on(table.cartId),
  uniqueCartItemIdx: uniqueIndex('cart_items_unique_idx').on(table.cartId, table.productId, table.size),
}));


export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // Optional link to user
  userName: text('user_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  totalAmount: real('total_amount').notNull(),
  status: text('status', { enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] }).notNull().default('PENDING'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('orders_user_id_idx').on(table.userId),
  statusIdx: index('orders_status_idx').on(table.status),
  userNameIdx: index('orders_user_name_idx').on(table.userName),
  phoneIdx: index('orders_phone_idx').on(table.phone),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
}));

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  priceAtPurchase: real('price_at_purchase').notNull(),
  quantity: integer('quantity').notNull(),
  size: text('size').notNull(),
}, (table) => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
  productIdIdx: index('order_items_product_id_idx').on(table.productId),
  // Composite index for order detail queries
  orderProductIdx: uniqueIndex('order_items_order_product_idx').on(table.orderId, table.productId, table.size),
}));

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(), // e.g. "UPDATE_PRICE", "UPDATE_STOCK", "ORDER_STATUS_CHANGE"
  entityId: text('entity_id').notNull(),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  actionIdx: index('audit_logs_action_idx').on(table.action),
  entityIdIdx: index('audit_logs_entity_id_idx').on(table.entityId),
}));

export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
}, (table) => ({
  productIdIdx: index('product_images_product_id_idx').on(table.productId),
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
  sizes: many(productSizes),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  images: many(productImages),
}));

export const productSizesRelations = relations(productSizes, ({ one }) => ({
  product: one(products, { fields: [productSizes.productId], references: [products.id] }),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(users, { fields: [cart.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(cart, { fields: [cartItems.cartId], references: [cart.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductSize = typeof productSizes.$inferSelect;
export type Cart = typeof cart.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;