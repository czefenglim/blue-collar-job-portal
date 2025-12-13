-- AlterTable
ALTER TABLE `companies` ADD COLUMN `hasCompletedInitialSubscription` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `planType` ENUM('FREE', 'PRO', 'MAX') NOT NULL DEFAULT 'FREE',
    `status` ENUM('ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE') NOT NULL DEFAULT 'ACTIVE',
    `stripeCustomerId` VARCHAR(191) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `stripeCurrentPeriodEnd` DATETIME(3) NULL,
    `jobPostLimit` INTEGER NOT NULL DEFAULT 1,
    `jobPostsUsed` INTEGER NOT NULL DEFAULT 0,
    `canReplyToReviews` BOOLEAN NOT NULL DEFAULT false,
    `billingCycleStart` DATETIME(3) NULL,
    `billingCycleEnd` DATETIME(3) NULL,
    `lastPaymentDate` DATETIME(3) NULL,
    `lastPaymentAmount` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `cancelledAt` DATETIME(3) NULL,

    UNIQUE INDEX `subscriptions_companyId_key`(`companyId`),
    UNIQUE INDEX `subscriptions_stripeCustomerId_key`(`stripeCustomerId`),
    UNIQUE INDEX `subscriptions_stripeSubscriptionId_key`(`stripeSubscriptionId`),
    INDEX `subscriptions_stripeCustomerId_idx`(`stripeCustomerId`),
    INDEX `subscriptions_stripeSubscriptionId_idx`(`stripeSubscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriptionId` INTEGER NOT NULL,
    `stripeInvoiceId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MYR',
    `status` VARCHAR(191) NOT NULL,
    `invoiceUrl` TEXT NULL,
    `invoicePdf` TEXT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoices_stripeInvoiceId_key`(`stripeInvoiceId`),
    INDEX `invoices_subscriptionId_idx`(`subscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
