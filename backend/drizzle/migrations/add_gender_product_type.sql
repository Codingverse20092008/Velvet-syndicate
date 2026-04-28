-- Migration: Add gender and product_type columns for strict category filtering
-- Categories: Men/Women
-- Product types: Casual, Walking, Jogging, Running, Sports, Sneakers

ALTER TABLE `products` ADD COLUMN `gender` text DEFAULT 'unisex';
ALTER TABLE `products` ADD COLUMN `product_type` text DEFAULT 'sneakers';
