/*
  Warnings:

  - You are about to drop the column `resumeKey` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_profiles` DROP COLUMN `resumeKey`,
    ADD COLUMN `resumeUrl` VARCHAR(191) NULL;
