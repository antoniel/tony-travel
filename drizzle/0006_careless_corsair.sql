ALTER TABLE `travel` ADD `budget` real;--> statement-breakpoint
ALTER TABLE `travel` DROP COLUMN `location_info`;--> statement-breakpoint
ALTER TABLE `travel` DROP COLUMN `visa_info`;--> statement-breakpoint
ALTER TABLE `flight` DROP COLUMN `flight_number`;