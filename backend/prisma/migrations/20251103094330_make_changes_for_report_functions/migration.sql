-- DropForeignKey
ALTER TABLE `jobs` DROP FOREIGN KEY `jobs_suspendedBy_fkey`;

-- DropIndex
DROP INDEX `jobs_suspendedBy_fkey` ON `jobs`;

-- AlterTable
ALTER TABLE `jobs` MODIFY `suspendedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `suspendedBy` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
