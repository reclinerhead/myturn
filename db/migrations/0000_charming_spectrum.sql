CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`member_ids` text NOT NULL,
	`cadence_label` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`place_id` text NOT NULL,
	`date` text NOT NULL,
	`picked_by_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`picked_by_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_activity_date` ON `events` (`activity_id`,`date`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`monogram` text NOT NULL,
	`color` text NOT NULL,
	`photo_url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_email_unique` ON `people` (`email`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `places_activity_name_unique` ON `places` (`activity_id`,lower("name"));--> statement-breakpoint
CREATE TABLE `reviews` (
	`event_id` text NOT NULL,
	`person_id` text NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`omelette_quality` integer,
	`comment` text,
	`had` text,
	`distance_miles` real,
	`minutes` integer,
	PRIMARY KEY(`event_id`, `person_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reviews_stars_range" CHECK("reviews"."stars" BETWEEN 0 AND 5),
	CONSTRAINT "reviews_omelette_quality_range" CHECK("reviews"."omelette_quality" BETWEEN 0 AND 5)
);
