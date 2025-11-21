-- AlterTable
ALTER TABLE `companies` ADD COLUMN `verificationRemark` TEXT NULL,
    ADD COLUMN `verifiedDate` DATETIME(3) NULL,
    MODIFY `verificationStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending';
