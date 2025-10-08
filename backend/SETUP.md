# 🚀 Quick Setup Guide

## Bước 1: Cài đặt Dependencies

```bash
cd backend
pnpm install
# hoặc
npm install
```

## Bước 2: Cấu hình Database

1. Tạo database MySQL:
```sql
CREATE DATABASE mlm_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Copy và cấu hình .env:
```bash
cp .env.example .env
```

3. Sửa DATABASE_URL trong `.env`:
```env
DATABASE_URL="mysql://root:password@localhost:3306/mlm_ecommerce"
JWT_SECRET="your-very-secure-secret-key-at-least-32-characters-long"
```

## Bước 3: Setup Prisma

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed database với admin account
pnpm prisma:seed
```

## Bước 4: Chạy Development Server

```bash
pnpm run start:dev
```

Server sẽ khởi động tại:
- API: http://localhost:3000
- Docs: http://localhost:3000/api/docs

## Bước 5: Test API

### Login với Admin account

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mlm.com",
    "password": "Admin@123456"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@mlm.com",
      "username": "admin",
      "role": "ADMIN"
    }
  }
}
```

### Lấy thông tin user hiện tại

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Tạo user mới (Manager)

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@mlm.com",
    "username": "manager01",
    "password": "Manager@123",
    "role": "MANAGER",
    "sponsorId": "ADMIN_USER_ID",
    "firstName": "Manager",
    "lastName": "One"
  }'
```

## 📚 Swagger UI

Truy cập http://localhost:3000/api/docs để xem tất cả endpoints và test trực tiếp.

## 🛠️ Prisma Studio

Để xem và quản lý database qua GUI:

```bash
pnpm prisma:studio
```

Mở http://localhost:5555

## ❓ Troubleshooting

### Lỗi: "Can't reach database server"

- Kiểm tra MySQL đang chạy
- Kiểm tra DATABASE_URL đúng
- Kiểm tra firewall/port 3306

### Lỗi: "Prisma Client not generated"

```bash
pnpm prisma:generate
```

### Lỗi: "Table doesn't exist"

```bash
pnpm prisma:migrate
```

### Reset database (cẩn thận: xóa tất cả data!)

```bash
pnpm prisma migrate reset
```

## 📝 Next Steps

1. ✅ Backend setup hoàn thành
2. 🔲 Tạo Product module
3. 🔲 Tạo Order module  
4. 🔲 Tạo Commission module
5. 🔲 Setup frontend Next.js

Xem `claude.md` để biết roadmap chi tiết!
