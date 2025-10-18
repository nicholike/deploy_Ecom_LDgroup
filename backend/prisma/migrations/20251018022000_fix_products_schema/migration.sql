-- Fix products table schema to match current requirements
-- Products can have variants, so price/sku/stock are nullable

ALTER TABLE `products`
  MODIFY `price` DECIMAL(10, 2) NULL,
  MODIFY `sku` VARCHAR(191) NULL,
  MODIFY `stock` INTEGER NULL DEFAULT 0,
  MODIFY `low_stock_threshold` INTEGER NULL DEFAULT 10;

-- Drop NOT NULL constraint on sku unique index
ALTER TABLE `products` DROP INDEX `products_sku_key`;
CREATE UNIQUE INDEX `products_sku_key` ON `products`(`sku`);
