-- Enterprise Migration: Add Idempotency to Orders
-- Ensures exactly-once order creation even under network failures

-- Add idempotency key column with NOT NULL constraint
ALTER TABLE orders ADD COLUMN idempotency_key TEXT NOT NULL DEFAULT '';

-- Create unique index for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_idx 
ON orders(idempotency_key);

-- Add comment for documentation
-- This ensures that the same idempotency key can never create multiple orders
-- providing exactly-once semantics for order creation
