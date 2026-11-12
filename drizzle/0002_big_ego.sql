CREATE TABLE `connect_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `connect_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `connect_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `content_cards` ADD `category_id` int;--> statement-breakpoint
ALTER TABLE `content_cards` ADD CONSTRAINT `content_cards_category_id_connect_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `connect_categories`(`id`) ON DELETE set null ON UPDATE no action;