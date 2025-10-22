-- AlterTable: Add size-specific quota fields to users table
-- 5ml: 300, 20ml: 300, Special: 10

ALTER TABLE `users` 
ADD COLUMN `quota_5ml_limit` INT NOT NULL DEFAULT 300,
ADD COLUMN `quota_5ml_used` INT NOT NULL DEFAULT 0,
ADD COLUMN `quota_20ml_limit` INT NOT NULL DEFAULT 300,
ADD COLUMN `quota_20ml_used` INT NOT NULL DEFAULT 0,
ADD COLUMN `quota_special_limit` INT NOT NULL DEFAULT 10,
ADD COLUMN `quota_special_used` INT NOT NULL DEFAULT 0;

-- Note: Old quota_limit and quota_used fields are kept for backwards compatibility
-- They will be deprecated in future versions

