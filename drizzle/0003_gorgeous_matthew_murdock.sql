CREATE TABLE `article_image_references` (
	`post_id` int NOT NULL,
	`path_hash` varchar(64) NOT NULL,
	`asset_path` varchar(1024) NOT NULL,
	`post_title` varchar(1024) NOT NULL,
	CONSTRAINT `article_image_references_post_id_path_hash_pk` PRIMARY KEY(`post_id`,`path_hash`)
);
--> statement-breakpoint
CREATE INDEX `article_image_references_path_idx` ON `article_image_references` (`path_hash`);