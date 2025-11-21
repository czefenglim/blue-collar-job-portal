-- AlterTable
ALTER TABLE `companies` ADD COLUMN `description_ms` TEXT NULL,
    ADD COLUMN `description_ta` TEXT NULL,
    ADD COLUMN `description_zh` TEXT NULL,
    ADD COLUMN `name_ms` VARCHAR(191) NULL,
    ADD COLUMN `name_ta` VARCHAR(191) NULL,
    ADD COLUMN `name_zh` VARCHAR(191) NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `industries` ADD COLUMN `description_ms` VARCHAR(191) NULL,
    ADD COLUMN `description_ta` VARCHAR(191) NULL,
    ADD COLUMN `description_zh` VARCHAR(191) NULL,
    ADD COLUMN `name_ms` VARCHAR(191) NULL,
    ADD COLUMN `name_ta` VARCHAR(191) NULL,
    ADD COLUMN `name_zh` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `jobs` ADD COLUMN `benefits_ms` TEXT NULL,
    ADD COLUMN `benefits_ta` TEXT NULL,
    ADD COLUMN `benefits_zh` TEXT NULL,
    ADD COLUMN `description_ms` TEXT NULL,
    ADD COLUMN `description_ta` TEXT NULL,
    ADD COLUMN `description_zh` TEXT NULL,
    ADD COLUMN `requirements_ms` TEXT NULL,
    ADD COLUMN `requirements_ta` TEXT NULL,
    ADD COLUMN `requirements_zh` TEXT NULL,
    ADD COLUMN `title_ms` VARCHAR(191) NULL,
    ADD COLUMN `title_ta` VARCHAR(191) NULL,
    ADD COLUMN `title_zh` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `language` ADD COLUMN `name_ms` VARCHAR(191) NULL,
    ADD COLUMN `name_ta` VARCHAR(191) NULL,
    ADD COLUMN `name_zh` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `skill` ADD COLUMN `name_ms` VARCHAR(191) NULL,
    ADD COLUMN `name_ta` VARCHAR(191) NULL,
    ADD COLUMN `name_zh` VARCHAR(191) NULL;
