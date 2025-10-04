-- DropForeignKey
ALTER TABLE `saved_jobs` DROP FOREIGN KEY `saved_jobs_userId_fkey`;

-- AddForeignKey
ALTER TABLE `saved_jobs` ADD CONSTRAINT `saved_jobs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
