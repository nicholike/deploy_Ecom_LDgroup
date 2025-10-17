# 🚀 HƯỚNG DẪN DEPLOY LÊN RAILWAY

## Bước 1: Chuẩn bị
1. Đăng ký/đăng nhập Railway: https://railway.app
2. Đăng nhập GitHub để Railway connect với repo

---

## Bước 2: Tạo Project
1. Nhấn **"New Project"**
2. Chọn **"Deploy from GitHub repo"**
3. Chọn repo: `Ecomerce_LDGroup`
4. Railway sẽ tự động detect

---

## Bước 3: Add MySQL Database
1. Trong project Railway, nhấn **"+ New"**
2. Chọn **"Database" → "Add MySQL"**
3. Railway tự tạo biến `DATABASE_URL`

---

## Bước 4: Set Biến Môi Trường

Vào tab **"Variables"** của service backend và thêm:

### **BẮT BUỘC:**

```bash
# JWT Security (tạo random string)
JWT_SECRET=<your-random-secret-32-chars>
JWT_REFRESH_SECRET=<your-random-refresh-secret-32-chars>

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail>
SMTP_PASSWORD=<gmail-app-password>

# Frontend URL (sẽ set sau khi deploy frontend)
FRONTEND_URL=https://your-app.vercel.app

# Bank Info
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
BANK_NAME=BIDV

# SePay
SEPAY_API_KEY=<your-sepay-api-key>
```

> **Lưu ý:** Copy từ file `.env` local của bạn

---

## Bước 5: Configure Build Settings

Vào tab **"Settings"**:

- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npx prisma migrate deploy && npm run start:prod`

---

## Bước 6: Deploy

Railway tự động deploy khi save settings. Đợi 3-5 phút.

---

## Bước 7: Lấy URL Backend

1. Vào tab **"Settings"**
2. Phần **"Domains"** → **"Generate Domain"**
3. Copy URL: `https://your-app.up.railway.app`

---

## Bước 8: Test

Vào `https://your-app.up.railway.app/api/v1/health`

Nếu thấy `{"status": "ok"}` → Thành công! ✅

---

## Bước 9: Update Frontend URL

Sau khi deploy frontend lên Vercel:
1. Quay lại Railway → **Variables**
2. Sửa `FRONTEND_URL` thành URL Vercel
3. Redeploy backend

---

## 📝 Lưu Ý

- Commission rates đã hard-code trong `commission.constant.ts` (10%, 7%, 5%, 3%)
- Không cần set NODE_ENV, PORT, CORS_ORIGIN (Railway tự xử lý)
- Gmail SMTP: Phải tạo "App Password" trong Google Account settings
