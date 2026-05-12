-- Create reviews table
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`user_id` text,
	`rating` integer NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`is_fake` integer NOT NULL DEFAULT (false),
	`is_verified` integer NOT NULL DEFAULT (false),
	`helpful_count` integer NOT NULL DEFAULT (0),
	`fake_user_name` text,
	`fake_user_avatar` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action
);

-- Create indexes
CREATE INDEX `reviews_product_id_idx` ON `reviews`(`product_id`);
CREATE INDEX `reviews_user_id_idx` ON `reviews`(`user_id`);
CREATE INDEX `reviews_rating_idx` ON `reviews`(`rating`);
CREATE INDEX `reviews_is_fake_idx` ON `reviews`(`is_fake`);
CREATE INDEX `reviews_created_at_idx` ON `reviews`(`created_at`);
