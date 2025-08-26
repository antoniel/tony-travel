DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `accommodation` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
ALTER TABLE `accommodation` ALTER COLUMN "updated_at" TO "updated_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `app_event` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `app_event` ALTER COLUMN "updated_at" TO "updated_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `app_event` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `app_event` ADD `image_metadata` text;--> statement-breakpoint
ALTER TABLE `travel` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `travel` ALTER COLUMN "updated_at" TO "updated_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `verification` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `verification` ALTER COLUMN "updated_at" TO "updated_at" integer NOT NULL;