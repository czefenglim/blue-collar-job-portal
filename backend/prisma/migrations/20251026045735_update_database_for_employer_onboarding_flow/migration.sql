-- AlterTable
ALTER TABLE `companies` ADD COLUMN `onboardingCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `onboardingStep` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `verificationDocument` TEXT NULL,
    ADD COLUMN `verificationStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `verifiedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `jobs` ADD COLUMN `skills` TEXT NULL;

-- CreateTable
CREATE TABLE `company_verifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `businessDocument` TEXT NULL,
    `documentType` VARCHAR(191) NULL,
    `documentName` VARCHAR(191) NULL,
    `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NULL DEFAULT 'PENDING',
    `reviewNotes` TEXT NULL,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_verifications_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_verifications` ADD CONSTRAINT `company_verifications_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
