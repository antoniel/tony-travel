ALTER TABLE `travel` ADD `description` text;--> statement-breakpoint
ALTER TABLE `travel` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `travel` ADD `deleted_by` text REFERENCES user(id);