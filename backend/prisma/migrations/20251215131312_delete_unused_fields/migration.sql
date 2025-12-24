/*
  Warnings:

  - You are about to drop the column `verifiedAt` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the `job_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `job_analytics` DROP FOREIGN KEY `job_analytics_jobId_fkey`;

-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `messages_receiverId_fkey`;

-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `messages_senderId_fkey`;

-- AlterTable
ALTER TABLE `companies` DROP COLUMN `verifiedAt`;

-- AlterTable
ALTER TABLE `jobs` DROP COLUMN `approvedBy`;

-- DropTable
DROP TABLE `job_analytics`;

-- DropTable
DROP TABLE `messages`;
