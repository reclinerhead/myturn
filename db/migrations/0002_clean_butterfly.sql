ALTER TABLE `people` ADD `role` text;--> statement-breakpoint
UPDATE `people` SET `role` = 'Mom' WHERE `id` = 'karen' AND `role` IS NULL;--> statement-breakpoint
UPDATE `people` SET `role` = 'Son of Karen' WHERE `id` = 'chad' AND `role` IS NULL;--> statement-breakpoint
UPDATE `people` SET `role` = 'Aunt' WHERE `id` = 'kathy' AND `role` IS NULL;
