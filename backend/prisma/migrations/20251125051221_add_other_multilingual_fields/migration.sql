-- AlterTable
ALTER TABLE `appeals` ADD COLUMN `reviewNotes_ms` TEXT NULL,
    ADD COLUMN `reviewNotes_ta` TEXT NULL,
    ADD COLUMN `reviewNotes_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `verificationRemark_ms` TEXT NULL,
    ADD COLUMN `verificationRemark_ta` TEXT NULL,
    ADD COLUMN `verificationRemark_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `company_verifications` ADD COLUMN `reviewNotes_ms` TEXT NULL,
    ADD COLUMN `reviewNotes_ta` TEXT NULL,
    ADD COLUMN `reviewNotes_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `jobs` ADD COLUMN `suspensionReason_ms` TEXT NULL,
    ADD COLUMN `suspensionReason_ta` TEXT NULL,
    ADD COLUMN `suspensionReason_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `suspensionReason_ms` TEXT NULL,
    ADD COLUMN `suspensionReason_ta` TEXT NULL,
    ADD COLUMN `suspensionReason_zh` TEXT NULL;
