ALTER TABLE `inzeraty` ADD `reservedBy` integer REFERENCES `users`(`id`) ON DELETE SET NULL;
ALTER TABLE `inzeraty` ADD `buyerId` integer REFERENCES `users`(`id`) ON DELETE SET NULL;
ALTER TABLE `inzeraty` ADD `paymentDone` integer DEFAULT false NOT NULL;
ALTER TABLE `inzeraty` ADD `viewsCount` integer DEFAULT 0 NOT NULL;
ALTER TABLE `inzeraty` ADD `ownerLastSeenViews` integer DEFAULT 0 NOT NULL;
ALTER TABLE `inzeraty` ADD `soldAt` integer;
