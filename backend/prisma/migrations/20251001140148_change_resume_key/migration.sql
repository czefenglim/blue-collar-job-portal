/*
  Warnings:

  - You are about to drop the column `resumeFileName` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `resumeUrl` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_profiles` DROP COLUMN `resumeFileName`,
    DROP COLUMN `resumeUrl`,
    ADD COLUMN `resumeKey` VARCHAR(191) NULL;
