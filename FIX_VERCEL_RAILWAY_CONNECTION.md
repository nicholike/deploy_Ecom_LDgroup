# 🔧 FIX: Vercel Frontend không kết nối được với Railway Backend

## ❌ Vấn đề hiện tại

Console log báo lỗi:
```
Failed to parse response JSON: SyntaxError: JSON.parse: unexpected character at line 1 column 1
Failed to load data: Error: Received malformed response from server
```

**Nguyên nhân:** Frontend trên Vercel đang cố gắng gọi API tới `http://localhost:3000/api/v1` thay vì Railway backend URL.

---

## ✅ GIẢI PHÁP

### BƯỚC 1: Lấy URL của Backend trên Railway

1. Đăng nhập Railway: https://railway.app
2. Vào project backend của bạn
3. Vào tab **"Settings"** 
4. Phần **"Networking"** → **"Public Networking"**
5. Nếu chưa có domain, nhấn **"Generate Domain"**
6. Copy URL (ví dụ: `https://ecomerce-ldgroup-production.up.railway.app`)

**Lưu lại URL này!** Ví dụ: `https://ecomerce-ldgroup-production.up.railway.app`

---

### BƯỚC 2: Cấu hình CORS cho Backend (Railway)

1. Vào Railway project backend
2. Vào tab **"Variables"**
3. Thêm/Sửa biến môi trường:

```bash
CORS_ORIGIN=https://deploy-ecom-l-dgroup.vercel.app
```

**Quan trọng:** 
- Nếu bạn có nhiều domain (www, non-www), dùng dấu phẩy:
  ```bash
  CORS_ORIGIN=https://deploy-ecom-l-dgroup.vercel.app,https://your-other-domain.vercel.app
  ```
- **KHÔNG** thêm dấu `/` ở cuối URL
- Đảm bảo đúng protocol `https://`

4. Sau khi thêm, Railway sẽ tự động **redeploy**. Đợi 2-3 phút.

---

### BƯỚC 3: Cấu hình Environment Variables cho Frontend (Vercel)

#### Option A: Qua Vercel Dashboard (Khuyên dùng)

1. Đăng nhập Vercel: https://vercel.com
2. Vào project frontend: `deploy-ecom-l-dgroup`
3. Vào **"Settings"** → **"Environment Variables"**
4. Thêm biến mới:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_API_URL` | `https://ecomerce-ldgroup-production.up.railway.app/api/v1` | Production, Preview, Development |

**Lưu ý:** 
- Thay `https://ecomerce-ldgroup-production.up.railway.app` bằng URL Railway của bạn từ BƯỚC 1
- Phải có `/api/v1` ở cuối
- **KHÔNG** thêm dấu `/` sau `v1`

5. Sau khi save, vào tab **"Deployments"**
6. Nhấn **"Redeploy"** deployment mới nhất

#### Option B: Qua Vercel CLI

```bash
cd frontend
vercel env add VITE_API_URL production
# Nhập: https://ecomerce-ldgroup-production.up.railway.app/api/v1

vercel env add VITE_API_URL preview  
# Nhập: https://ecomerce-ldgroup-production.up.railway.app/api/v1

vercel env add VITE_API_URL development
# Nhập: https://ecomerce-ldgroup-production.up.railway.app/api/v1

# Redeploy
vercel --prod
```

---

### BƯỚC 4: Test kết nối

#### Test Backend (Railway)

Mở trình duyệt, truy cập:
```
https://ecomerce-ldgroup-production.up.railway.app/api/v1/health
```

**Kết quả mong đợi:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T..."
}
```

Nếu không thấy, backend chưa sẵn sàng. Check logs trên Railway.

#### Test CORS

Mở Console trên Vercel frontend (`https://deploy-ecom-l-dgroup.vercel.app`):

```javascript
fetch('https://ecomerce-ldgroup-production.up.railway.app/api/v1/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Kết quả mong đợi:** `{status: "ok", ...}`

**Nếu lỗi CORS:** Quay lại BƯỚC 2, kiểm tra lại `CORS_ORIGIN`

---

## 🎯 CHECKLIST

Sau khi làm xong 4 bước, kiểm tra:

- [ ] Backend Railway có public domain
- [ ] Backend Railway có biến `CORS_ORIGIN` với Vercel URL
- [ ] Frontend Vercel có biến `VITE_API_URL` với Railway URL
- [ ] Frontend đã redeploy sau khi thêm biến
- [ ] Backend health check trả về `{status: "ok"}`
- [ ] Frontend console không còn lỗi JSON parse
- [ ] Dữ liệu trên frontend load được (sản phẩm, categories, etc.)

---

## 🔍 TROUBLESHOOTING

### Vẫn lỗi "Failed to parse response JSON"?

1. **Check environment variable trên Vercel:**
   ```bash
   # Trên máy local
   vercel env ls
   ```
   
   Đảm bảo `VITE_API_URL` có ở tất cả environments.

2. **Check trong build log của Vercel:**
   - Vào Deployments → Click vào deployment mới nhất
   - Xem **Build Logs**
   - Tìm dòng có `VITE_API_URL`
   - Nếu không thấy → biến chưa được set đúng

3. **Check Network tab:**
   - Mở DevTools (F12)
   - Tab Network
   - Reload trang
   - Click vào các API request
   - Xem **Request URL** → phải là Railway URL, không phải localhost

### Lỗi CORS?

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Fix:**
1. Vào Railway → Variables → Check `CORS_ORIGIN`
2. Đảm bảo đúng URL Vercel frontend
3. Không có khoảng trắng thừa
4. Có dấu phẩy nếu nhiều domain

### Lỗi 401 Unauthorized?

- Đây là lỗi khác, có nghĩa kết nối thành công nhưng thiếu token
- Đăng nhập lại trên frontend
- Token được lưu trong localStorage

---

## 📝 EXAMPLE CONFIGURATION

### Railway Backend Variables:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://...
JWT_SECRET=your-secret-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-32-chars
CORS_ORIGIN=https://deploy-ecom-l-dgroup.vercel.app
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
```

### Vercel Frontend Variables:

```bash
VITE_API_URL=https://ecomerce-ldgroup-production.up.railway.app/api/v1
```

---

## 🚨 QUAN TRỌNG

1. **VITE_ prefix:** Vercel/Vite chỉ expose biến có prefix `VITE_` ra client. Không dùng `REACT_APP_` hay `NEXT_PUBLIC_`

2. **Rebuild:** Sau khi thêm environment variable, **BẮT BUỘC** phải redeploy/rebuild. Biến không tự động apply vào build cũ.

3. **Cache:** Nếu vẫn lỗi, clear cache browser (Ctrl+Shift+Delete) và hard reload (Ctrl+F5)

4. **URL format:**
   - ✅ `https://domain.com/api/v1` 
   - ❌ `https://domain.com/api/v1/` (dư dấu /)
   - ❌ `https://domain.com` (thiếu /api/v1)

---

## 💡 TIP: Test Local trước khi deploy

Trước khi deploy, test local với Railway backend:

```bash
cd frontend

# Set env cho terminal session
export VITE_API_URL=https://ecomerce-ldgroup-production.up.railway.app/api/v1

# Chạy dev
npm run dev
```

Nếu local connect được Railway → config đúng → deploy lên Vercel sẽ work!

---

Sau khi làm xong, frontend trên Vercel sẽ kết nối thành công với backend Railway! 🎉

