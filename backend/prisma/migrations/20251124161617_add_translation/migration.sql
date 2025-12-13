-- AlterTable
ALTER TABLE `admin_actions` ADD COLUMN `reason_ms` TEXT NULL,
    ADD COLUMN `reason_ta` TEXT NULL,
    ADD COLUMN `reason_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `appeals` ADD COLUMN `explanation_ms` TEXT NULL,
    ADD COLUMN `explanation_ta` TEXT NULL,
    ADD COLUMN `explanation_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `job_appeals` ADD COLUMN `explanation_ms` TEXT NULL,
    ADD COLUMN `explanation_ta` TEXT NULL,
    ADD COLUMN `explanation_zh` TEXT NULL,
    ADD COLUMN `reviewNotes_ms` TEXT NULL,
    ADD COLUMN `reviewNotes_ta` TEXT NULL,
    ADD COLUMN `reviewNotes_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `jobs` ADD COLUMN `rejectionReason_ms` TEXT NULL,
    ADD COLUMN `rejectionReason_ta` TEXT NULL,
    ADD COLUMN `rejectionReason_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `message_ms` TEXT NULL,
    ADD COLUMN `message_ta` TEXT NULL,
    ADD COLUMN `message_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `description_ms` TEXT NULL,
    ADD COLUMN `description_ta` TEXT NULL,
    ADD COLUMN `description_zh` TEXT NULL;

-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `comment_ms` TEXT NULL,
    ADD COLUMN `comment_ta` TEXT NULL,
    ADD COLUMN `comment_zh` TEXT NULL,
    ADD COLUMN `employerReply_ms` TEXT NULL,
    ADD COLUMN `employerReply_ta` TEXT NULL,
    ADD COLUMN `employerReply_zh` TEXT NULL,
    ADD COLUMN `flagReason_ms` TEXT NULL,
    ADD COLUMN `flagReason_ta` TEXT NULL,
    ADD COLUMN `flagReason_zh` TEXT NULL;
