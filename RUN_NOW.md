# 🚀 CHẠY BACKEND NGAY BÂY GIỜ

## ✅ Đã Sửa Tất Cả Lỗi

### Lỗi đã fix:
1. ✅ **TypeScript error trong prisma.service.ts** - Đã fix type checking
2. ✅ **Missing fastify package** - Đã install
3. ✅ **Build thành công** - 0 errors!

---

## 🎯 CHẠY BACKEND (3 Cách)

### Cách 1: Terminal Riêng (RECOMMENDED)

**Mở terminal mới** và chạy:

```bash
cd /home/dieplai/Ecomerce_LDGroup/backend
pnpm run start:dev
```

**Đợi thấy:**
```
✅ Database connected

🚀 MLM E-commerce Backend is running!

📡 Server: http://localhost:3000
📚 API Docs: http://localhost:3000/api/docs
🔑 API Prefix: /api/v1
🌍 Environment: development
```

### Cách 2: Background Process

```bash
cd /home/dieplai/Ecomerce_LDGroup/backend
nohup pnpm run start:dev > backend.log 2>&1 &
tail -f backend.log
```

### Cách 3: Production Mode

```bash
cd /home/dieplai/Ecomerce_LDGroup/backend
pnpm run build
pnpm run start:prod
```

---

## 🎨 MỞ FRONTEND TEST

**Trong terminal khác:**

```bash
# Option 1: Trực tiếp
xdg-open /home/dieplai/Ecomerce_LDGroup/frontend-test/index.html

# Option 2: HTTP Server (recommended cho CORS)
cd /home/dieplai/Ecomerce_LDGroup/frontend-test
python -m http.server 8080
# Sau đó mở: http://localhost:8080
```

---

## ✅ TEST NGAY

### 1. Check Backend Running

```bash
# Trong terminal mới
curl http://localhost:3000/api/v1/auth/me
```

Nếu thấy `401 Unauthorized` → Backend đang chạy OK! ✅

### 2. Test Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mlm.com",
    "password": "Admin@123456"
  }'
```

Nếu thấy `accessToken` → Perfect! ✅

### 3. Mở Frontend UI

1. Mở `frontend-test/index.html`
2. Thấy "● Online" (màu xanh) → Backend connected ✅
3. Login với `admin@mlm.com` / `Admin@123456`
4. Click "Get Me" → Thấy admin info ✅

---

## 📊 Quick Links

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **Frontend Test**: file:///home/dieplai/Ecomerce_LDGroup/frontend-test/index.html
- **Prisma Studio**: `pnpm prisma:studio` → http://localhost:5555

---

## 🔧 Troubleshooting

### Port 3000 đã được dùng?

```bash
# Kill process
sudo lsof -ti:3000 | xargs kill -9

# Hoặc đổi port trong .env
PORT=3001
```

### Database connection error?

```bash
# Check MySQL running
systemctl status mariadb

# Start MySQL
sudo systemctl start mariadb

# Test connection
mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce -e "SELECT 1;"
```

### Prisma Client error?

```bash
cd /home/dieplai/Ecomerce_LDGroup/backend
pnpm prisma:generate
```

### Build error?

```bash
# Clean và rebuild
rm -rf dist node_modules/.cache
pnpm run build
```

---

## 💡 Tips

1. **Luôn chạy backend trong terminal riêng** để xem logs real-time
2. **Frontend test** nên chạy qua HTTP server (python) để tránh CORS
3. **Prisma Studio** rất hữu ích để xem database: `pnpm prisma:studio`
4. **Swagger UI** tốt nhất để test API: http://localhost:3000/api/docs

---

## 📝 Credentials

### Database
```
mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce
```

### Admin Account
```
Email: admin@mlm.com
Password: Admin@123456
```

---

## 🎉 Ready!

Sau khi backend chạy:

1. ✅ Mở frontend test
2. ✅ Login với admin
3. ✅ Test các API endpoints
4. ✅ Implement module tiếp theo!

**Happy Coding! 🚀**

