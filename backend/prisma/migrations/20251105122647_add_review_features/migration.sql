/*
  Warnings:

  - A unique constraint covering the columns `[userId,companyId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Made the column `companyId` on table `reviews` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `isVisible` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `companyId` INTEGER NOT NULL,
    MODIFY `title` VARCHAR(200) NULL,
    MODIFY `isApproved` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `reviews_companyId_idx` ON `reviews`(`companyId`);

-- CreateIndex
CREATE UNIQUE INDEX `reviews_userId_companyId_key` ON `reviews`(`userId`, `companyId`);

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
