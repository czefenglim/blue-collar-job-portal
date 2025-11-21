-- AlterTable
ALTER TABLE `companies` ADD COLUMN `industryId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_industryId_fkey` FOREIGN KEY (`industryId`) REFERENCES `industries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
