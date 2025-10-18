-- AlterTable: Add locked_at and locked_reason columns to users table
ALTER TABLE `users`
  ADD COLUMN `locked_at` DATETIME(3) NULL,
  ADD COLUMN `locked_reason` VARCHAR(191) NULL;
