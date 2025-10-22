-- AlterTable
-- Update quotaSpecialLimit to 999999 (unlimited) for all users
-- New users will get this as default from schema

-- Update default value for new rows
ALTER TABLE `users` MODIFY COLUMN `quota_special_limit` INT NOT NULL DEFAULT 999999;

-- Update existing users to have unlimited special quota
UPDATE `users` SET `quota_special_limit` = 999999;

