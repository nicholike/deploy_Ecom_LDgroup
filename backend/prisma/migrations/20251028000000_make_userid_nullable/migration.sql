-- Make userId nullable in Order table for hard delete support
ALTER TABLE `orders` MODIFY `user_id` VARCHAR(191) NULL;

-- Make userId nullable in Commission table for hard delete support
ALTER TABLE `commissions` MODIFY `user_id` VARCHAR(191) NULL;
ALTER TABLE `commissions` MODIFY `from_user_id` VARCHAR(191) NULL;

-- Make userId nullable in WithdrawalRequest table for hard delete support
ALTER TABLE `withdrawal_requests` MODIFY `user_id` VARCHAR(191) NULL;

-- Drop foreign key constraints and recreate with ON DELETE SET NULL
-- Orders
ALTER TABLE `orders` DROP FOREIGN KEY `orders_user_id_fkey`;
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_id_fkey`
  FOREIGN KEY (`user_id`)
  REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Commissions (user_id)
ALTER TABLE `commissions` DROP FOREIGN KEY `commissions_user_id_fkey`;
ALTER TABLE `commissions`
  ADD CONSTRAINT `commissions_user_id_fkey`
  FOREIGN KEY (`user_id`)
  REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Commissions (from_user_id)
ALTER TABLE `commissions` DROP FOREIGN KEY `commissions_from_user_id_fkey`;
ALTER TABLE `commissions`
  ADD CONSTRAINT `commissions_from_user_id_fkey`
  FOREIGN KEY (`from_user_id`)
  REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Withdrawal Requests
ALTER TABLE `withdrawal_requests` DROP FOREIGN KEY `withdrawal_requests_user_id_fkey`;
ALTER TABLE `withdrawal_requests`
  ADD CONSTRAINT `withdrawal_requests_user_id_fkey`
  FOREIGN KEY (`user_id`)
  REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
