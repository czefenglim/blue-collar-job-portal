-- AlterTable
ALTER TABLE `job_applications` MODIFY `status` ENUM('PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'REJECTED', 'HIRED', 'WITHDRAWN', 'OFFERED', 'OFFER_ACCEPTED', 'OFFER_REJECTED') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `job_offers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `contractDuration` VARCHAR(191) NOT NULL,
    `durationPeriod` VARCHAR(191) NULL,
    `salaryAmount` DECIMAL(10, 2) NOT NULL,
    `salaryCurrency` VARCHAR(191) NOT NULL,
    `payFrequency` VARCHAR(191) NOT NULL,
    `contractUrl` VARCHAR(191) NULL,
    `employerConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `compliesWithLaws` BOOLEAN NOT NULL DEFAULT false,
    `applicantStatus` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `applicantSignature` TEXT NULL,
    `signedContractUrl` TEXT NULL,
    `employerVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `job_offers_applicationId_key`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `job_offers` ADD CONSTRAINT `job_offers_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
