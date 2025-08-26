CREATE TABLE `accommodation` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`address` text,
	`rating` real,
	`price` real,
	`currency` text,
	`travel_id` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`travel_id`) REFERENCES `travel`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `app_event` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`estimated_cost` real,
	`type` text NOT NULL,
	`location` text,
	`travel_id` text NOT NULL,
	`parent_event_id` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`travel_id`) REFERENCES `travel`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `travel` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`destination` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`location_info` text NOT NULL,
	`visa_info` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
