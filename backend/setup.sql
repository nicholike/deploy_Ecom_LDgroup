-- MLM E-commerce Database Setup SQL
-- Run: sudo mysql < setup.sql

-- Create database
CREATE DATABASE IF NOT EXISTS mlm_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER IF NOT EXISTS 'mlm_user'@'localhost' IDENTIFIED BY 'mlm_password_2025';

-- Grant privileges
GRANT ALL PRIVILEGES ON mlm_ecommerce.* TO 'mlm_user'@'localhost';

-- Reload privileges
FLUSH PRIVILEGES;

-- Show databases
SHOW DATABASES;

-- Show users
SELECT User, Host FROM mysql.user WHERE User = 'mlm_user';
