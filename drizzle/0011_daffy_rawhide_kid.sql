CREATE TABLE `flight_segment` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`slice_id` text NOT NULL,
	`segment_index` integer NOT NULL,
	`origin_airport` text NOT NULL,
	`destination_airport` text NOT NULL,
	`departure_date` integer NOT NULL,
	`departure_time` text NOT NULL,
	`arrival_date` integer NOT NULL,
	`arrival_time` text NOT NULL,
	`marketing_carrier_code` text,
	`marketing_flight_number` text,
	`operating_carrier_code` text,
	`aircraft_name` text,
	`aircraft_type` text,
	`distance_meters` integer,
	`duration_minutes` integer,
	`baggage_allowance` text DEFAULT 'null',
	FOREIGN KEY (`slice_id`) REFERENCES `flight_slice`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flight_slice` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`flight_id` text NOT NULL,
	`slice_index` integer NOT NULL,
	`origin_airport` text NOT NULL,
	`destination_airport` text NOT NULL,
	`duration_minutes` integer,
	`cabin_class` text,
	`cabin_class_marketing_name` text,
	FOREIGN KEY (`flight_id`) REFERENCES `flight`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `travel` ALTER COLUMN "destination_airports" TO "destination_airports" text NOT NULL;--> statement-breakpoint
ALTER TABLE `flight` ADD `total_amount` real;--> statement-breakpoint
ALTER TABLE `flight` ADD `currency` text DEFAULT 'BRL';--> statement-breakpoint
ALTER TABLE `flight` ADD `base_amount` real;--> statement-breakpoint
ALTER TABLE `flight` ADD `tax_amount` real;--> statement-breakpoint
ALTER TABLE `flight` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `flight` ADD `offer_reference` text;--> statement-breakpoint
ALTER TABLE `flight` ADD `data_source` text;--> statement-breakpoint
ALTER TABLE `flight` ADD `metadata` text DEFAULT 'null';--> statement-breakpoint
ALTER TABLE `flight` ADD `legacy_migrated_at` integer;