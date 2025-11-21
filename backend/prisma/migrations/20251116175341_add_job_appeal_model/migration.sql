/*
  Warnings:

  - The values [REJECTED] on the enum `jobs_approvalStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `jobs` MODIFY `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED_AI', 'APPEALED', 'REJECTED_FINAL') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `job_appeals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `employerId` INTEGER NOT NULL,
    `explanation` TEXT NOT NULL,
    `evidence` TEXT NULL,
    `updatedJobData` JSON NULL,
    `status` ENUM('PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `adminDecision` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `job_appeals_jobId_idx`(`jobId`),
    INDEX `job_appeals_employerId_idx`(`employerId`),
    INDEX `job_appeals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `job_appeals` ADD CONSTRAINT `job_appeals_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_appeals` ADD CONSTRAINT `job_appeals_employerId_fkey` FOREIGN KEY (`employerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_appeals` ADD CONSTRAINT `job_appeals_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
