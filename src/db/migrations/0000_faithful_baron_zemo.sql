CREATE TABLE `inzeraty` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nazev` text NOT NULL,
	`popis` text NOT NULL,
	`kategorie` text NOT NULL,
	`kontakt` text NOT NULL,
	`stav` text NOT NULL,
	`foto` text NOT NULL,
	`cena` integer,
	`free` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `systemSetting` (
	`name` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
