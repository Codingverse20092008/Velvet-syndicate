import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  phone: text('phone'),
  address: text('address'),
  avatar: text('avatar'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  phoneIdx: uniqueIndex('users_phone_idx').on(table.phone),
}));

// OTP Verifications
export const otpVerifications = sqliteTable('otp_verifications', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  otpHash: text('otp_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  emailIdx: index('otp_verifications_email_idx').on(table.email),
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
  gender: text('gender').notNull().default('unisex'),
  productType: text('product_type').notNull().default('sneakers'),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  features: text('features'),
  careInstructions: text('care_instructions'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
  brandIdx: index('products_brand_idx').on(table.brand),
  categoryIdx: index('products_category_idx').on(table.category),
  genderIdx: index('products_gender_idx').on(table.gender),
  productTypeIdx: index('products_product_type_idx').on(table.productType),
  featuredIdx: index('products_featured_idx').on(table.featured),
  // Enterprise Composite Indexes
  genderTypeIdx: index('products_gender_type_idx').on(table.gender, table.productType),
  brandTypeIdx: index('products_brand_type_idx').on(table.brand, table.productType),
  priceIdx: index('products_price_idx').on(table.price),
  createdAtIdx: index('products_created_at_idx').on(table.createdAt),
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
  version: integer('version').notNull().default(0),
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

// Address Table
export const addresses = sqliteTable('addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('addresses_user_id_idx').on(table.userId),
}));

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  totalAmount: real('total_amount').notNull(),
  status: text('status', { enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED'] }).notNull().default('PENDING'),
  paymentStatus: text('payment_status', { enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] }).notNull().default('PENDING'),
  paymentMethod: text('payment_method').notNull().default('COD'),
  shippingAddress: text('shipping_address').notNull(),
  idempotencyKey: text('idempotency_key'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('orders_user_id_idx').on(table.userId),
  statusIdx: index('orders_status_idx').on(table.status),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  idempotencyKeyIdx: uniqueIndex('orders_idempotency_key_idx').on(table.idempotencyKey),
}));

// 🛡️ DUAL PERSISTENCE: Write-Ahead Log for Order Intents
export const orderIntents = sqliteTable('order_intents', {
  id: text('id').primaryKey(), // Usually same as idempotencyKey
  userId: text('user_id').notNull().references(() => users.id),
  data: text('data').notNull(), // JSON blob of order details
  status: text('status', {
    enum: ['RECEIVED', 'READY_FOR_QUEUE', 'ENQUEUED', 'PROCESSING', 'PROCESSING_STALE', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'QUEUED', 'FAILED'],
  }).notNull().default('READY_FOR_QUEUE'),
  error: text('error'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('order_intents_user_id_idx').on(table.userId),
  statusIdx: index('order_intents_status_idx').on(table.status),
}));

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  productPrice: real('product_price').notNull(),
  quantity: integer('quantity').notNull(),
  size: text('size').notNull(),
  variantId: text('variant_id'),
  imageUrl: text('image_url'),
}, (table) => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  addresses: many(addresses),
  orders: many(orders),
  cart: one(cart, { fields: [users.id], references: [cart.userId] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
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
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

// Events Table (Analytics)
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // nullable - anonymous tracking
  eventType: text('event_type').notNull(),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdx: index('events_user_id_idx').on(table.userId),
  eventTypeIdx: index('events_event_type_idx').on(table.eventType),
  createdAtIdx: index('events_created_at_idx').on(table.createdAt),
}));

export type Event = typeof events.$inferSelect;

// Feedback Table (User Feedback Collection)
export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // nullable - anonymous feedback
  message: text('message').notNull(),
  rating: text('rating'), // 1-5, nullable
  page: text('page'), // URL where feedback was given
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdx: index('feedback_user_id_idx').on(table.userId),
  ratingIdx: index('feedback_rating_idx').on(table.rating),
  createdAtIdx: index('feedback_created_at_idx').on(table.createdAt),
}));

export type Feedback = typeof feedback.$inferSelect;

// 🔑 Password Reset Tokens
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
  tokenHashIdx: uniqueIndex('password_reset_tokens_token_hash_idx').on(table.tokenHash),
}));
 
// 📂 Collections Table
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('collections_slug_idx').on(table.slug),
}));

// 🔗 Collection-Product Mapping
export const collectionProducts = sqliteTable('collection_products', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
}, (table) => ({
  collectionIdIdx: index('collection_products_collection_id_idx').on(table.collectionId),
  productIdIdx: index('collection_products_product_id_idx').on(table.productId),
  uniqueItemIdx: uniqueIndex('collection_products_unique_idx').on(table.collectionId, table.productId),
}));

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type CollectionProduct = typeof collectionProducts.$inferSelect;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
