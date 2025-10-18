-- CreateTable: notifications
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` ENUM('ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'COMMISSION_EARNED', 'COMMISSION_PAID', 'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'WITHDRAWAL_COMPLETED', 'NEW_DOWNLINE', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED', 'SYSTEM_ANNOUNCEMENT', 'PROMOTION', 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `action_url` VARCHAR(191) NULL,
    `action_text` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_idx`(`user_id`),
    INDEX `notifications_read_idx`(`read`),
    INDEX `notifications_created_at_idx`(`created_at`),
    INDEX `notifications_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
