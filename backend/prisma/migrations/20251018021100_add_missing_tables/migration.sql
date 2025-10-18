-- Add all missing tables

-- Password Reset Tokens
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `password_reset_tokens_user_id_idx`(`user_id`),
    INDEX `password_reset_tokens_token_hash_idx`(`token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Product Variants
CREATE TABLE `product_variants` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `cost_price` DECIMAL(10, 2) NULL,
    `sale_price` DECIMAL(10, 2) NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `low_stock_threshold` INTEGER NOT NULL DEFAULT 10,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `product_variants_sku_key`(`sku`),
    INDEX `product_variants_product_id_idx`(`product_id`),
    INDEX `product_variants_sku_idx`(`sku`),
    INDEX `product_variants_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Price Tiers
CREATE TABLE `price_tiers` (
    `id` VARCHAR(191) NOT NULL,
    `product_variant_id` VARCHAR(191) NOT NULL,
    `min_quantity` INTEGER NOT NULL,
    `max_quantity` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `label` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `price_tiers_product_variant_id_idx`(`product_variant_id`),
    INDEX `price_tiers_min_quantity_idx`(`min_quantity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Carts
CREATE TABLE `carts` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `carts_user_id_key`(`user_id`),
    INDEX `carts_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cart Items
CREATE TABLE `cart_items` (
    `id` VARCHAR(191) NOT NULL,
    `cart_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `product_variant_id` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `cart_items_cart_id_idx`(`cart_id`),
    INDEX `cart_items_product_id_idx`(`product_id`),
    INDEX `cart_items_product_variant_id_idx`(`product_variant_id`),
    UNIQUE INDEX `cart_items_cart_id_product_id_product_variant_id_key`(`cart_id`, `product_id`, `product_variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Pending Orders
CREATE TABLE `pending_orders` (
    `id` VARCHAR(191) NOT NULL,
    `pending_number` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `items` JSON NOT NULL,
    `subtotal` DECIMAL(18, 2) NOT NULL,
    `shipping_fee` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(18, 2) NOT NULL,
    `shipping_address` JSON NULL,
    `shipping_method` VARCHAR(191) NULL,
    `payment_method` VARCHAR(191) NULL,
    `customer_note` TEXT NULL,
    `status` ENUM('AWAITING_PAYMENT', 'PAID', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'AWAITING_PAYMENT',
    `order_id` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    UNIQUE INDEX `pending_orders_pending_number_key`(`pending_number`),
    UNIQUE INDEX `pending_orders_order_id_key`(`order_id`),
    INDEX `pending_orders_user_id_idx`(`user_id`),
    INDEX `pending_orders_pending_number_idx`(`pending_number`),
    INDEX `pending_orders_status_idx`(`status`),
    INDEX `pending_orders_expires_at_idx`(`expires_at`),
    INDEX `pending_orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Wallets
CREATE TABLE `wallets` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `wallets_user_id_key`(`user_id`),
    INDEX `wallets_user_id_idx`(`user_id`),
    INDEX `wallets_balance_idx`(`balance`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Wallet Transactions
CREATE TABLE `wallet_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `wallet_id` VARCHAR(191) NOT NULL,
    `type` ENUM('COMMISSION_EARNED', 'COMMISSION_REFUND', 'WITHDRAWAL', 'ADMIN_ADJUSTMENT', 'ORDER_REFUND') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `balance_before` DECIMAL(18, 2) NOT NULL,
    `balance_after` DECIMAL(18, 2) NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `commission_id` VARCHAR(191) NULL,
    `withdrawal_id` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `wallet_transactions_wallet_id_idx`(`wallet_id`),
    INDEX `wallet_transactions_type_idx`(`type`),
    INDEX `wallet_transactions_order_id_idx`(`order_id`),
    INDEX `wallet_transactions_commission_id_idx`(`commission_id`),
    INDEX `wallet_transactions_withdrawal_id_idx`(`withdrawal_id`),
    INDEX `wallet_transactions_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- System Settings
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'STRING',
    `category` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `label` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `editable` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `system_settings_key_key`(`key`),
    INDEX `system_settings_category_idx`(`category`),
    INDEX `system_settings_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bank Transactions
CREATE TABLE `bank_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `sepay_transaction_id` INTEGER NULL,
    `gateway` VARCHAR(191) NOT NULL,
    `transaction_date` DATETIME(3) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `sub_account` VARCHAR(191) NULL,
    `amount_in` DECIMAL(18, 2) NOT NULL,
    `amount_out` DECIMAL(18, 2) NOT NULL,
    `accumulated` DECIMAL(18, 2) NOT NULL,
    `code` TEXT NULL,
    `transaction_content` TEXT NOT NULL,
    `reference_number` VARCHAR(191) NULL,
    `body` TEXT NULL,
    `order_id` VARCHAR(191) NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `bank_transactions_sepay_transaction_id_key`(`sepay_transaction_id`),
    INDEX `bank_transactions_order_id_idx`(`order_id`),
    INDEX `bank_transactions_gateway_idx`(`gateway`),
    INDEX `bank_transactions_account_number_idx`(`account_number`),
    INDEX `bank_transactions_transaction_date_idx`(`transaction_date`),
    INDEX `bank_transactions_processed_idx`(`processed`),
    INDEX `bank_transactions_transaction_content_idx`(`transaction_content`(191)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add Foreign Keys
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `price_tiers` ADD CONSTRAINT `price_tiers_product_variant_id_fkey` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_variant_id_fkey` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pending_orders` ADD CONSTRAINT `pending_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pending_orders` ADD CONSTRAINT `pending_orders_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
