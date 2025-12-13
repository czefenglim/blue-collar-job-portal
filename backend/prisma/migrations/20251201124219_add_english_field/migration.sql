-- AlterTable
ALTER TABLE `admin_actions` ADD COLUMN `reason_en` TEXT NULL;

-- AlterTable
ALTER TABLE `appeals` ADD COLUMN `explanation_en` TEXT NULL,
    ADD COLUMN `reviewNotes_en` TEXT NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `name_en` VARCHAR(191) NULL,
    ADD COLUMN `verificationRemark_en` TEXT NULL;

-- AlterTable
ALTER TABLE `company_verifications` ADD COLUMN `reviewNotes_en` TEXT NULL;

-- AlterTable
ALTER TABLE `industries` ADD COLUMN `description_en` VARCHAR(191) NULL,
    ADD COLUMN `name_en` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `job_appeals` ADD COLUMN `explanation_en` TEXT NULL,
    ADD COLUMN `reviewNotes_en` TEXT NULL;

-- AlterTable
ALTER TABLE `jobs` ADD COLUMN `benefits_en` TEXT NULL,
    ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `rejectionReason_en` TEXT NULL,
    ADD COLUMN `requirements_en` TEXT NULL,
    ADD COLUMN `suspensionReason_en` TEXT NULL,
    ADD COLUMN `title_en` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `language` ADD COLUMN `name_en` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `message_en` TEXT NULL;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `reviewNotes_en` TEXT NULL;

-- AlterTable
ALTER TABLE `resumequestion` ADD COLUMN `question_en` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `comment_en` TEXT NULL,
    ADD COLUMN `employerReply_en` TEXT NULL,
    ADD COLUMN `flagReason_en` TEXT NULL;

-- AlterTable
ALTER TABLE `skill` ADD COLUMN `name_en` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `suspensionReason_en` TEXT NULL;
