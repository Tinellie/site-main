CREATE TABLE `content_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('connect','project','article') NOT NULL,
	`title` varchar(200) NOT NULL,
	`username` varchar(200) NOT NULL DEFAULT '',
	`link` varchar(2048) NOT NULL,
	`description` text NOT NULL,
	`image` varchar(1024) NOT NULL DEFAULT '',
	`icon` varchar(100) NOT NULL DEFAULT 'Language',
	CONSTRAINT `content_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `content_cards` (`kind`, `title`, `username`, `link`, `description`, `image`, `icon`) VALUES
('connect', 'GitHub', '@example', 'https://github.com', '', '', 'GitHub'),
('connect', 'Email', 'hello@example.com', 'mailto:hello@example.com', '', '', 'Email'),
('connect', 'Website', 'example.com', 'https://example.com', '', 'proj-icon.png', 'Language'),
('connect', 'Instagram', '@example', 'https://www.instagram.com', '', '', 'Instagram'),
('connect', 'LinkedIn', 'Example', 'https://www.linkedin.com', '', '', 'LinkedIn'),
('connect', 'YouTube', '@example', 'https://www.youtube.com', '', '', 'YouTube'),
('project', 'Personal Website', '', '/', 'A personal space for projects, writing and photography. This longer description tests multiline truncation and the native browser tooltip without changing the card height.', 'proj.png', 'Language'),
('project', 'Interface Playground', '', 'https://example.com', 'Experiments with reusable components and responsive layouts.', 'proj2.png', 'Language'),
('project', 'Visual Study', '', '/gallery', 'A small visual experiment.', 'model.jpg', 'Language'),
('project', 'Design Notes', '', '/blog', '', 'model2.jpg', 'Language'),
('article', 'Building a Personal Blog', '', '/blog/first-post', 'Notes on Next.js, MUI, and keeping a small website maintainable. This longer single-line description should end with an ellipsis on a narrow screen.', 'DSC01748.JPG', 'Language'),
('article', 'Reusable Interface Patterns', '', '/blog/interface-notes', 'A collection of practical component patterns.', 'proj.png', 'Language');
