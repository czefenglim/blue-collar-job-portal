-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `employerReply` TEXT NULL,
    ADD COLUMN `flagReason` TEXT NULL,
    ADD COLUMN `flaggedAt` DATETIME(3) NULL,
    ADD COLUMN `isFlagged` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `repliedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `reviews_isVisible_idx` ON `reviews`(`isVisible`);

-- CreateIndex
CREATE INDEX `reviews_isFlagged_idx` ON `reviews`(`isFlagged`);
