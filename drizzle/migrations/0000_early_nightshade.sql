CREATE TABLE `agentLogs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caseId` integer NOT NULL,
	`agentName` text(64) NOT NULL,
	`action` text(64) NOT NULL,
	`input` text,
	`output` text,
	`reasoning` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text(255) NOT NULL,
	`description` text,
	`query` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caseId` integer NOT NULL,
	`summary` text,
	`findings` text,
	`precedents` text,
	`statutes` text,
	`recommendation` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text(64) NOT NULL,
	`name` text,
	`email` text(320),
	`loginMethod` text(64),
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);