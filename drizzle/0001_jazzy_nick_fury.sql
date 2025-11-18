CREATE TABLE `agentLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`agentName` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`input` text,
	`output` text,
	`reasoning` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`query` text NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`summary` text,
	`findings` text,
	`precedents` text,
	`statutes` text,
	`recommendation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agentLogs` ADD CONSTRAINT `agentLogs_caseId_cases_id_fk` FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_caseId_cases_id_fk` FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON DELETE no action ON UPDATE no action;