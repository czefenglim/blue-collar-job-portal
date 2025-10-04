/*
  Warnings:

  - You are about to drop the column `profilePicture` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_profiles` ADD COLUMN `profilePicture` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `profilePicture`;
