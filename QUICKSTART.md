# ⚡ Quick Start - MLM E-commerce

## 🏃‍♂️ Chạy Trong 3 Phút

### 1. Clone & Install (30 giây)
```bash
cd backend
pnpm install
```

### 2. Database Setup (1 phút)
```bash
# Tạo database
mysql -u root -p -e "CREATE DATABASE mlm_ecommerce"

# Copy .env
cp .env.example .env

# Sửa .env
nano .env  # hoặc code .env
```

Thay đổi:
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/mlm_ecommerce"
JWT_SECRET="my-super-secret-key-minimum-32-chars"
```

### 3. Migrate & Seed (30 giây)
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### 4. Start Server (10 giây)
```bash
pnpm run start:dev
```

### 5. Test API (30 giây)
Mở http://localhost:3000/api/docs

Click "Authorize", login với:
```
Email: admin@mlm.com
Password: Admin@123456
```

**DONE!** 🎉

---

## 📌 Cheat Sheet

### NPM Scripts
```bash
pnpm run start:dev        # Dev server (hot reload)
pnpm run build            # Build production
pnpm prisma:studio        # Database GUI
pnpm run lint             # Check code
pnpm run test             # Run tests
```

### Default Accounts
```
Admin:
  Email: admin@mlm.com
  Password: Admin@123456
  Role: ADMIN
```

### API Endpoints
```
Auth:
  POST /api/v1/auth/login
  GET  /api/v1/auth/me

Users:
  POST /api/v1/users
  GET  /api/v1/users
  GET  /api/v1/users/:id
  PUT  /api/v1/users/:id
```

### Environment Variables
```env
DATABASE_URL="mysql://user:pass@localhost:3306/mlm_ecommerce"
JWT_SECRET="your-secret-key-at-least-32-characters"
PORT=3000
NODE_ENV=development
```

---

## 🎯 Next Module: Product

Xem `claude.md` section "Product Module" để implement tiếp!

---

## ❓ Problems?

### Database Error
```bash
# Check MySQL running
sudo systemctl status mysql

# Reset database
pnpm prisma migrate reset
```

### Port 3000 Busy
```bash
# Change in .env
PORT=3001
```

### Prisma Error
```bash
pnpm prisma:generate
```

---

**Full Docs**: Xem `claude.md` và `PROJECT_STATUS.md`
