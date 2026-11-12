ALTER TABLE `content_cards` ADD `position` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `content_cards` SET `position` = `id`;