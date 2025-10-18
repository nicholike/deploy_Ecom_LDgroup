-- AlterTable: Add is_special column to products table
ALTER TABLE `products` ADD COLUMN `is_special` BOOLEAN NOT NULL DEFAULT false;
