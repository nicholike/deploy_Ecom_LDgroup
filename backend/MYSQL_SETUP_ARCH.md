# 🐧 MySQL Setup Guide - Arch Linux

## ✅ Trạng Thái Hiện Tại

- ✅ MariaDB 12.0.2 đã cài đặt
- ✅ Service đang chạy (enabled)
- 🔲 Cần tạo database và user

---

## 🚀 Option 1: Setup Tự Động (RECOMMENDED)

### Chạy script setup:

```bash
cd /home/dieplai/Ecomerce_LDGroup/backend
./setup-database.sh
```

Script sẽ tự động:
1. ✅ Tạo database `mlm_ecommerce`
2. ✅ Tạo user `mlm_user` với password `mlm_password_2025`
3. ✅ Cập nhật file `.env`
4. ✅ Test connection
5. ✅ Hiển thị thông tin database

**Sau đó chạy:**
```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm run start:dev
```

---

## 🔧 Option 2: Setup Thủ Công

### Bước 1: Kết nối MySQL

```bash
sudo mysql
```

### Bước 2: Tạo Database và User

```sql
-- Tạo database
CREATE DATABASE mlm_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo user
CREATE USER 'mlm_user'@'localhost' IDENTIFIED BY 'mlm_password_2025';

-- Cấp quyền
GRANT ALL PRIVILEGES ON mlm_ecommerce.* TO 'mlm_user'@'localhost';

-- Reload privileges
FLUSH PRIVILEGES;

-- Kiểm tra
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'mlm_user';

-- Thoát
EXIT;
```

### Bước 3: Test Connection

```bash
mysql -u mlm_user -p
# Nhập password: mlm_password_2025

# Trong MySQL:
USE mlm_ecommerce;
SHOW TABLES;
EXIT;
```

### Bước 4: Cập nhật .env

```bash
cd /home/dieplai/Ecomerce_LDGroup/backend

# Copy .env.example nếu chưa có
cp .env.example .env

# Edit .env
nano .env  # hoặc code .env
```

Thay đổi dòng DATABASE_URL:
```env
DATABASE_URL="mysql://mlm_user:mlm_password_2025@localhost:3306/mlm_ecommerce"
```

### Bước 5: Generate JWT Secret

```bash
# Generate random secret
openssl rand -base64 32
```

Copy kết quả vào .env:
```env
JWT_SECRET="<kết-quả-từ-lệnh-trên>"
```

### Bước 6: Run Prisma Migrations

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed database
pnpm prisma:seed
```

### Bước 7: Start Development Server

```bash
pnpm run start:dev
```

---

## 🔍 Verify Database

### Kiểm tra tables đã tạo:

```bash
mysql -u mlm_user -p mlm_ecommerce -e "SHOW TABLES;"
```

Kết quả mong đợi:
```
+---------------------------+
| Tables_in_mlm_ecommerce   |
+---------------------------+
| categories                |
| commission_configs        |
| commissions               |
| order_items               |
| orders                    |
| products                  |
| user_tree                 |
| users                     |
| withdrawal_requests       |
+---------------------------+
```

### Kiểm tra admin user:

```bash
mysql -u mlm_user -p mlm_ecommerce -e "SELECT id, email, username, role FROM users WHERE role = 'ADMIN';"
```

---

## 🛠️ Troubleshooting

### Lỗi: "Access denied for user"

```bash
# Reset MySQL root password
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

### Lỗi: "Can't connect to MySQL server"

```bash
# Start MariaDB service
sudo systemctl start mariadb

# Enable auto-start
sudo systemctl enable mariadb

# Check status
systemctl status mariadb
```

### Lỗi: "Table doesn't exist"

```bash
cd backend
pnpm prisma:migrate
```

### Reset toàn bộ database

```bash
# WARNING: Xóa tất cả data!
pnpm prisma migrate reset
```

---

## 📊 Useful Commands

### MariaDB Service

```bash
# Start service
sudo systemctl start mariadb

# Stop service
sudo systemctl stop mariadb

# Restart service
sudo systemctl restart mariadb

# Check status
systemctl status mariadb

# View logs
sudo journalctl -u mariadb -n 50
```

### Database Management

```bash
# Login as root
sudo mysql

# Login as mlm_user
mysql -u mlm_user -p

# Backup database
mysqldump -u mlm_user -p mlm_ecommerce > backup.sql

# Restore database
mysql -u mlm_user -p mlm_ecommerce < backup.sql

# Show all databases
mysql -u mlm_user -p -e "SHOW DATABASES;"

# Show all tables
mysql -u mlm_user -p mlm_ecommerce -e "SHOW TABLES;"
```

### Prisma Commands

```bash
# Open Prisma Studio (GUI)
pnpm prisma:studio

# Format schema
pnpm prisma format

# Validate schema
pnpm prisma validate

# View database schema
pnpm prisma db pull

# Reset and seed
pnpm prisma migrate reset
```

---

## 🔐 Security Notes

### Change Default Password

Sau khi setup xong, nên đổi password production:

```sql
ALTER USER 'mlm_user'@'localhost' IDENTIFIED BY 'your_super_secure_password';
FLUSH PRIVILEGES;
```

Và update trong `.env`:
```env
DATABASE_URL="mysql://mlm_user:your_super_secure_password@localhost:3306/mlm_ecommerce"
```

### Create Read-Only User (Optional)

```sql
CREATE USER 'mlm_readonly'@'localhost' IDENTIFIED BY 'readonly_password';
GRANT SELECT ON mlm_ecommerce.* TO 'mlm_readonly'@'localhost';
FLUSH PRIVILEGES;
```

---

## 🎯 Next Steps

Sau khi database setup xong:

1. ✅ Verify API: http://localhost:3000/api/docs
2. ✅ Login với admin@mlm.com / Admin@123456
3. ✅ Test tạo user mới
4. ✅ Implement Product module tiếp

---

## 📞 Quick Reference

**Database Credentials:**
```
Host: localhost
Port: 3306
Database: mlm_ecommerce
Username: mlm_user
Password: mlm_password_2025
```

**Connection String:**
```
mysql://mlm_user:mlm_password_2025@localhost:3306/mlm_ecommerce
```

**Admin Account:**
```
Email: admin@mlm.com
Password: Admin@123456
```

---

Happy Coding! 🚀
