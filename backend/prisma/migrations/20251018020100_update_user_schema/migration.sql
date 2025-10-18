-- Update User table to match current schema

-- Add missing columns
ALTER TABLE `users`
  ADD COLUMN `approved_at` DATETIME(3) NULL,
  ADD COLUMN `approved_by` VARCHAR(191) NULL,
  ADD COLUMN `rejected_at` DATETIME(3) NULL,
  ADD COLUMN `rejected_by` VARCHAR(191) NULL,
  ADD COLUMN `rejection_reason` TEXT NULL,
  ADD COLUMN `quota_period_start` DATETIME(3) NULL,
  ADD COLUMN `quota_limit` INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN `quota_used` INTEGER NOT NULL DEFAULT 0;

-- Update UserRole enum
ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6') NOT NULL DEFAULT 'F6';

-- Update UserStatus enum
ALTER TABLE `users` MODIFY `status` ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- Add indexes
CREATE INDEX `users_status_idx` ON `users`(`status`);
CREATE INDEX `users_approved_at_idx` ON `users`(`approved_at`);
CREATE INDEX `users_rejected_at_idx` ON `users`(`rejected_at`);
