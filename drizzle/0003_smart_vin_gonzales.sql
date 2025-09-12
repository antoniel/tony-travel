CREATE TABLE `flight` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer NOT NULL,
	`flight_number` text,
	`origin_airport` text NOT NULL,
	`destination_airport` text NOT NULL,
	`departure_date` integer NOT NULL,
	`departure_time` text NOT NULL,
	`arrival_date` integer NOT NULL,
	`arrival_time` text NOT NULL,
	`cost` real,
	`travel_id` text NOT NULL,
	FOREIGN KEY (`travel_id`) REFERENCES `travel`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flight_participant` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer NOT NULL,
	`flight_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`flight_id`) REFERENCES `flight`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
