/*
  Warnings:

  - You are about to drop the column `resumeUrl` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_profiles` DROP COLUMN `resumeUrl`,
    ADD COLUMN `resumeGeneratedAt` DATETIME(3) NULL,
    ADD COLUMN `resumeSource` ENUM('NONE', 'AI_GENERATED', 'USER_UPLOADED', 'BOTH') NULL DEFAULT 'NONE',
    ADD COLUMN `resumeUrl_en` TEXT NULL,
    ADD COLUMN `resumeUrl_ms` TEXT NULL,
    ADD COLUMN `resumeUrl_ta` TEXT NULL,
    ADD COLUMN `resumeUrl_uploaded` TEXT NULL,
    ADD COLUMN `resumeUrl_zh` TEXT NULL,
    ADD COLUMN `resumeVersion` INTEGER NULL DEFAULT 1,
    ADD COLUMN `uploadedAt` DATETIME(3) NULL,
    ADD COLUMN `uploadedFileName` VARCHAR(191) NULL,
    ADD COLUMN `uploadedLanguage` VARCHAR(191) NULL;
