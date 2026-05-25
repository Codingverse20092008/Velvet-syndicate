-- Adds Summer Sale campaign flag for inventory-driven /summer-sale page
ALTER TABLE `products` ADD COLUMN `is_summer_sale` integer DEFAULT 0 NOT NULL;

