# ⚡ Quick Environment Setup

## 📝 Thông Tin Cần Chuẩn Bị Trước Khi Deploy

### ✅ ĐÃ CÓ SẴN - Không cần làm gì

Các thông tin sau đã có sẵn trong code, **chỉ cần copy-paste vào Railway:**

```bash
# Application (✅ GIỮ NGUYÊN)
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# Security (✅ GIỮ NGUYÊN)
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
CORS_ORIGIN=*

# SePay - Đã configured (✅ GIỮ NGUYÊN)
SEPAY_API_KEY=H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
BANK_NAME=BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam
SEPAY_VA_NUMBER=96247LAI712004
SEPAY_VA_ACCOUNT_NAME=Diep Lai

# Commission Rates (✅ GIỮ NGUYÊN hoặc customize)
DEFAULT_COMMISSION_RATE_F1=10
DEFAULT_COMMISSION_RATE_F2=4
DEFAULT_COMMISSION_RATE_F3=2
DEFAULT_COMMISSION_RATE_F4=0

# Upload (✅ GIỮ NGUYÊN)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

---

## ⚠️ PHẢI GENERATE MỚI

**Chỉ có 2 biến này cần generate:**

```bash
# Chạy command này 2 lần để có 2 secrets khác nhau
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Lần 1 - Copy kết quả vào:**
```bash
JWT_SECRET=<PASTE_HERE>
JWT_EXPIRES_IN=1d
```

**Lần 2 - Copy kết quả vào:**
```bash
JWT_REFRESH_SECRET=<PASTE_HERE>
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 🔄 UPDATE SAU KHI DEPLOY

Sau khi deploy frontend, update biến này:

```bash
CORS_ORIGIN=https://your-frontend.vercel.app,https://your-backend.up.railway.app
```

---

## 📋 FULL TEMPLATE (Copy vào Railway)

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

JWT_SECRET=o4Eu6RI6nldnhM6+8HnXEIH92W/zyMTP04nEXBPIyRY=
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=G8/eML48RGEy6kUUxbUJL/2ckGjbNhNpKnrlHbfZr5I=
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
CORS_ORIGIN=*

SEPAY_API_KEY=H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
BANK_NAME=BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam
SEPAY_VA_NUMBER=96247LAI712004
SEPAY_VA_ACCOUNT_NAME=Diep Lai

DEFAULT_COMMISSION_RATE_F1=10
DEFAULT_COMMISSION_RATE_F2=4
DEFAULT_COMMISSION_RATE_F3=2
DEFAULT_COMMISSION_RATE_F4=0

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

**⚠️ LƯU Ý:**
- JWT secrets trên đây là mẫu - bạn nên generate của riêng mình
- DATABASE_URL không cần thêm - Railway tự động inject

---

## 🎯 Tóm Tắt

**Bạn CHỈ CẦN:**
1. Generate 2 JWT secrets (chạy command 2 lần)
2. Copy toàn bộ template vào Railway Variables 
3. Thay 2 JWT secrets bằng secrets vừa generate
4. Save → Railway tự động deploy

**Xong! Đơn giản vậy thôi!** 🎉

---

**Chi tiết đầy đủ:** Xem `ENV_VARIABLES_EXPLAINED.md`
