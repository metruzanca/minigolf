CREATE TABLE `games` (
	`id` integer PRIMARY KEY NOT NULL,
	`shortCode` text NOT NULL,
	`numHoles` integer NOT NULL,
	`currentHole` integer DEFAULT 1 NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY NOT NULL,
	`gameId` integer NOT NULL,
	`name` text NOT NULL,
	`ballColor` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` integer PRIMARY KEY NOT NULL,
	`playerId` integer NOT NULL,
	`gameId` integer NOT NULL,
	`holeNumber` integer NOT NULL,
	`score` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`playerId`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`password` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_id_unique` ON `games` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `games_shortCode_unique` ON `games` (`shortCode`);--> statement-breakpoint
CREATE UNIQUE INDEX `players_id_unique` ON `players` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `scores_id_unique` ON `scores` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);