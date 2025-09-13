CREATE TABLE `travel_invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`travel_id` text NOT NULL,
	`created_by` text NOT NULL,
	`token` text NOT NULL,
	`is_active` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`travel_id`) REFERENCES `travel`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `travel_invitation_token_unique` ON `travel_invitation` (`token`);--> statement-breakpoint
CREATE TABLE `travel_member` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`travel_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`travel_id`) REFERENCES `travel`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "travel_invitation_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `accommodation` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
ALTER TABLE `accommodation` ALTER COLUMN "address" TO "address" text NOT NULL;--> statement-breakpoint
ALTER TABLE `accommodation` ALTER COLUMN "price" TO "price" real NOT NULL;--> statement-breakpoint
ALTER TABLE `accommodation` DROP COLUMN `rating`;--> statement-breakpoint
ALTER TABLE `accommodation` DROP COLUMN `currency`;--> statement-breakpoint
ALTER TABLE `account` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `app_event` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `flight` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `flight_participant` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `travel` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `verification` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;