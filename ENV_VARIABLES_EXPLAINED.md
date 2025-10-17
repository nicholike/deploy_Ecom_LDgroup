# 📋 Environment Variables - Chi Tiết Giải Thích

## 🎯 Tổng Quan

Environment variables là các thiết lập cấu hình cho backend. Railway đọc các biến này để backend hoạt động đúng.

---

## 1️⃣ Application Settings (Cấu hình ứng dụng)

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1
```

### Giải thích:
- **NODE_ENV=production**
  - **Mục đích:** Cho backend biết đang chạy production (không phải development)
  - **Tác dụng:** Enable các tính năng production (caching, optimizations, security checks)
  - **✅ GIỮ NGUYÊN:** Không cần thay đổi

- **PORT=3000**
  - **Mục đích:** Port mà backend lắng nghe requests
  - **Tác dụng:** Railway sẽ expose port này ra internet
  - **✅ GIỮ NGUYÊN:** 3000 là standard port

- **API_PREFIX=/api/v1**
  - **Mục đích:** Tất cả API endpoints sẽ bắt đầu bằng `/api/v1`
  - **Ví dụ:** `https://your-domain.com/api/v1/users`
  - **✅ GIỮ NGUYÊN:** Matching với frontend config

---

## 2️⃣ JWT Secrets (Bảo mật Authentication)

```bash
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=YOUR_GENERATED_REFRESH_SECRET_HERE
JWT_REFRESH_EXPIRES_IN=7d
```

### Giải thích:
- **JWT_SECRET**
  - **Mục đích:** Key mã hóa token khi user login
  - **Tác dụng:** Đảm bảo token không thể fake được
  - **⚠️ PHẢI GENERATE MỚI:** Dùng command bên dưới
  - **Yêu cầu:** Tối thiểu 32 ký tự, random, cryptographically secure

- **JWT_EXPIRES_IN=1d**
  - **Mục đích:** Token hết hạn sau bao lâu
  - **1d = 1 ngày:** User phải login lại sau 1 ngày
  - **✅ GIỮ NGUYÊN:** Hoặc thay đổi (2d, 7d, 12h, etc.)

- **JWT_REFRESH_SECRET**
  - **Mục đích:** Key mã hóa refresh token (dùng để gia hạn token)
  - **⚠️ PHẢI GENERATE MỚI:** Khác với JWT_SECRET
  - **Yêu cầu:** Tối thiểu 32 ký tự, random, khác JWT_SECRET

- **JWT_REFRESH_EXPIRES_IN=7d**
  - **Mục đích:** Refresh token hết hạn sau 7 ngày
  - **Tác dụng:** User có thể gia hạn session trong 7 ngày
  - **✅ GIỮ NGUYÊN:** Hoặc thay đổi theo nhu cầu

### 🔐 Cách Generate JWT Secrets:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Output example: kJ8mX2+pL5nR9qT3vW6yA1bC4dE7fH0i=

# Generate JWT_REFRESH_SECRET (chạy lại lần nữa để có secret khác)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Output example: zM9nY4+qN7pS2rU5xZ8aC3eF6hK1jL0m=
```

**⚠️ LƯU Ý:**
- Mỗi lần deploy mới nên generate secrets MỚI
- Không share secrets này ra ngoài
- Hai secrets phải KHÁC NHAU

---

## 3️⃣ Security Settings (Bảo mật)

```bash
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
CORS_ORIGIN=*
```

### Giải thích:
- **BCRYPT_SALT_ROUNDS=12**
  - **Mục đích:** Độ phức tạp khi hash password
  - **Tác dụng:** Số càng cao càng an toàn (nhưng chậm hơn)
  - **12 = Chuẩn production:** Balance giữa security và performance
  - **✅ GIỮ NGUYÊN:** 12 là đủ

- **RATE_LIMIT_TTL=60**
  - **Mục đích:** Time window cho rate limiting (60 giây)
  - **Tác dụng:** Reset counter sau 60 giây
  - **✅ GIỮ NGUYÊN:** 1 phút là hợp lý

- **RATE_LIMIT_MAX=100**
  - **Mục đích:** Giới hạn requests trong time window
  - **Tác dụng:** 1 IP chỉ được call 100 requests/60s
  - **Chống DDoS:** Ngăn spam requests
  - **✅ GIỮ NGUYÊN:** 100 req/min là đủ

- **CORS_ORIGIN=***
  - **Mục đích:** Cho phép domains nào call API
  - **`*` = Allow tất cả:** Tạm thời để test
  - **⚠️ PHẢI UPDATE SAU:** Sau khi deploy frontend
  - **Update thành:** `https://your-frontend.vercel.app,https://your-backend.up.railway.app`

---

## 4️⃣ SePay Payment (Thanh toán)

```bash
SEPAY_API_KEY=H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
BANK_NAME=BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam
SEPAY_VA_NUMBER=96247LAI712004
SEPAY_VA_ACCOUNT_NAME=Diep Lai
```

### Giải thích:
- **SEPAY_API_KEY**
  - **Mục đích:** API key để authenticate với SePay
  - **Lấy từ đâu:** SePay Dashboard (https://my.sepay.vn)
  - **✅ ĐÃ CÓ SẴN:** Key trong code đang dùng account của bạn
  - **Tác dụng:** Backend call SePay API để check transactions

- **BANK_ACCOUNT_NUMBER=6201235752**
  - **Mục đích:** Số tài khoản ngân hàng nhận tiền
  - **✅ ĐÃ CÓ:** Tài khoản BIDV của bạn
  - **Hiển thị:** Show cho khách khi thanh toán

- **BANK_ACCOUNT_NAME=DIEP DUC LAI**
  - **Mục đích:** Tên chủ tài khoản
  - **✅ ĐÃ CÓ:** Tên của bạn
  - **Hiển thị:** Show cho khách khi thanh toán

- **BANK_CODE=BIDV**
  - **Mục đích:** Mã ngân hàng (BIDV, VCB, TCB, etc.)
  - **✅ ĐÃ CÓ:** BIDV
  - **Dùng để:** Xác định ngân hàng khi thanh toán

- **BANK_NAME**
  - **Mục đích:** Tên đầy đủ ngân hàng
  - **✅ ĐÃ CÓ:** "BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam"
  - **Hiển thị:** Show cho khách

- **SEPAY_VA_NUMBER=96247LAI712004**
  - **Mục đích:** Virtual Account Number (số tài khoản ảo)
  - **✅ ĐÃ CÓ:** SePay cấp cho bạn
  - **Tác dụng:** Tracking thanh toán tự động

- **SEPAY_VA_ACCOUNT_NAME=Diep Lai**
  - **Mục đích:** Tên tài khoản ảo
  - **✅ ĐÃ CÓ:** Tên bạn
  - **Hiển thị:** Show trong SePay dashboard

**💡 Tất cả thông tin SePay đã được cấu hình sẵn, GIỮ NGUYÊN!**

---

## 5️⃣ Commission Rates (Hoa hồng MLM)

```bash
DEFAULT_COMMISSION_RATE_F1=10
DEFAULT_COMMISSION_RATE_F2=4
DEFAULT_COMMISSION_RATE_F3=2
DEFAULT_COMMISSION_RATE_F4=0
```

### Giải thích:
- **DEFAULT_COMMISSION_RATE_F1=10**
  - **Mục đích:** Hoa hồng cho downline cấp 1 (F1)
  - **10 = 10%:** F1 được 10% khi downline của họ mua hàng
  - **🔧 TÙY CHỈNH:** Thay đổi theo chính sách của bạn

- **DEFAULT_COMMISSION_RATE_F2=4**
  - **Mục đích:** Hoa hồng cho downline cấp 2 (F2)
  - **4 = 4%:** F2 được 4%
  - **🔧 TÙY CHỈNH:** Theo chính sách

- **DEFAULT_COMMISSION_RATE_F3=2**
  - **Mục đích:** Hoa hồng cho downline cấp 3 (F3)
  - **2 = 2%:** F3 được 2%
  - **🔧 TÙY CHỈNH:** Theo chính sách

- **DEFAULT_COMMISSION_RATE_F4=0**
  - **Mục đích:** Hoa hồng cho downline cấp 4 (F4)
  - **0 = 0%:** Không có hoa hồng cho F4
  - **🔧 TÙY CHỈNH:** Set > 0 nếu muốn enable F4

**💡 Ví dụ:**
- User A giới thiệu User B (B là F1 của A)
- User B mua hàng 1,000,000đ
- User A nhận: 1,000,000 × 10% = 100,000đ hoa hồng

---

## 6️⃣ Upload Settings (Upload file)

```bash
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### Giải thích:
- **UPLOAD_DIR=./uploads**
  - **Mục đích:** Thư mục lưu file upload (ảnh sản phẩm, avatar)
  - **✅ GIỮ NGUYÊN:** `./uploads` là relative path trong container

- **MAX_FILE_SIZE=5242880**
  - **Mục đích:** Giới hạn kích thước file upload
  - **5242880 bytes = 5MB:** Đủ cho ảnh
  - **✅ GIỮ NGUYÊN:** 5MB là hợp lý

---

## 7️⃣ Database (Tự động bởi Railway)

```bash
DATABASE_URL=mysql://username:password@host:3306/database
```

### Giải thích:
- **DATABASE_URL**
  - **Mục đích:** Connection string đến MySQL database
  - **✅ TỰ ĐỘNG:** Railway auto-inject khi bạn add MySQL
  - **❌ KHÔNG CẦN THÊM THỦ CÔNG**
  - **Format:** `mysql://user:pass@host:port/dbname`

---

## 📋 CHECKLIST - Thông Tin Cần Chuẩn Bị

### ✅ Đã Có Sẵn (Không cần làm gì):
- [x] Application settings (NODE_ENV, PORT, API_PREFIX)
- [x] Security settings (BCRYPT_SALT_ROUNDS, RATE_LIMIT)
- [x] SePay credentials (API key, bank account, VA number)
- [x] Commission rates (có thể giữ nguyên hoặc customize)
- [x] Upload settings (UPLOAD_DIR, MAX_FILE_SIZE)

### ⚠️ Phải Làm Trước Khi Deploy:
- [ ] **Generate JWT_SECRET** (chạy command bên dưới)
- [ ] **Generate JWT_REFRESH_SECRET** (chạy command bên dưới)

### 🔄 Cần Update Sau Deploy:
- [ ] **CORS_ORIGIN** - Update sau khi có frontend domain

---

## 🚀 Quick Setup Script

Copy và chạy để generate secrets:

```bash
echo "Generating JWT Secrets..."
echo ""

echo "JWT_SECRET:"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo $JWT_SECRET
echo ""

echo "JWT_REFRESH_SECRET:"
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo $JWT_REFRESH_SECRET
echo ""

echo "✅ Copy 2 secrets này vào Railway Variables!"
```

---

## 📝 Template Hoàn Chỉnh (Copy vào Railway)

Chạy script bên trên để generate secrets, rồi thay thế vào template:

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

JWT_SECRET=<PASTE_YOUR_GENERATED_JWT_SECRET_HERE>
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=<PASTE_YOUR_GENERATED_JWT_REFRESH_SECRET_HERE>
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

---

## 💡 Tóm Tắt

**Thông tin BẠN CẦN:**
1. Generate 2 JWT secrets (chạy command)
2. Tất cả các biến khác đã sẵn sàng

**Không cần:**
- ❌ Không cần SePay account mới (đã có)
- ❌ Không cần bank account mới (đã có)
- ❌ Không cần DATABASE_URL (Railway tự động)

**Sau khi deploy:**
- Update `CORS_ORIGIN` với frontend domain
- Configure SePay webhook

---

**Xong! Đơn giản chỉ cần generate 2 JWT secrets là deploy được! 🎉**
