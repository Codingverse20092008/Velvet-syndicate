-- Migration: 0001_email_otp
-- Adds email_verified to users & creates otp_verifications table

ALTER TABLE `users` ADD COLUMN `email_verified` integer NOT NULL DEFAULT 0;
--> statement-breakpoint

CREATE TABLE `otp_verifications` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `otp_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `attempts` integer NOT NULL DEFAULT 0,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint

CREATE INDEX `otp_verifications_email_idx` ON `otp_verifications` (`email`);
