-- AlterTable
-- Change sepay_transaction_id from INT to VARCHAR(191)
ALTER TABLE `bank_transactions` MODIFY `sepay_transaction_id` VARCHAR(191);
