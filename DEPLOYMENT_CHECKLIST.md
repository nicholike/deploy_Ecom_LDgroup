# ✅ DEPLOYMENT CHECKLIST - Vercel + Railway

## 📊 KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Browser)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           FRONTEND (Vercel)                                 │
│  https://deploy-ecom-l-dgroup.vercel.app                    │
│                                                             │
│  Environment Variables:                                     │
│  ✅ VITE_API_URL=https://xxx.railway.app/api/v1            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ API Calls
                         │ (fetch/axios)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           BACKEND (Railway)                                 │
│  https://ecomerce-ldgroup-production.up.railway.app         │
│                                                             │
│  Environment Variables:                                     │
│  ✅ CORS_ORIGIN=https://deploy-ecom-l-dgroup.vercel.app    │
│  ✅ DATABASE_URL=mysql://...                               │
│  ✅ JWT_SECRET=...                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ SQL Queries
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           DATABASE (Railway MySQL)                          │
│  Auto-provisioned by Railway                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 LỖI HIỆN TẠI

### Triệu chứng:
```
Failed to parse response JSON: SyntaxError: JSON.parse: unexpected character at line 1 column 1
```

### Nguyên nhân:
```
Frontend (Vercel)
    │
    │ Calls: http://localhost:3000/api/v1  ❌ WRONG!
    │
    ▼ 
localhost (không tồn tại trên Vercel server)
    │
    └──> Returns: HTML error page / No response
         Frontend tries: JSON.parse(HTML)
         Result: ❌ SyntaxError
```

### Đáng lẽ phải là:
```
Frontend (Vercel)
    │
    │ Calls: https://xxx.railway.app/api/v1  ✅ CORRECT!
    │
    ▼ 
Backend (Railway)
    │
    └──> Returns: JSON response
         Frontend: JSON.parse(JSON)
         Result: ✅ Success
```

---

## ✅ GIẢI PHÁP

### CẤU HÌNH BACKEND (RAILWAY)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Chế độ production |
| `PORT` | Auto by Railway | Port server |
| `DATABASE_URL` | Auto by Railway | Kết nối MySQL |
| `JWT_SECRET` | `your-32-char-secret` | Mã hóa JWT token |
| `JWT_REFRESH_SECRET` | `your-32-char-secret` | Mã hóa refresh token |
| **`CORS_ORIGIN`** | **`https://deploy-ecom-l-dgroup.vercel.app`** | **Cho phép frontend gọi API** |
| `BANK_CODE` | `BIDV` | Thông tin ngân hàng |
| `BANK_ACCOUNT_NUMBER` | `6201235752` | Số tài khoản |
| `BANK_ACCOUNT_NAME` | `DIEP DUC LAI` | Tên tài khoản |

### CẤU HÌNH FRONTEND (VERCEL)

| Variable | Value | Purpose |
|----------|-------|---------|
| **`VITE_API_URL`** | **`https://ecomerce-ldgroup-production.up.railway.app/api/v1`** | **URL của backend API** |

---

## 📋 CHECKLIST DEPLOYMENT

### ✅ BACKEND (Railway)

- [ ] **Project đã deploy thành công**
  - Check: Railway Dashboard → Deployments → Status: "Success"
  
- [ ] **Database đã được tạo**
  - Check: Railway Dashboard → Database service → Status: "Active"
  
- [ ] **Public domain đã generate**
  - Check: Settings → Networking → Public Networking
  - URL mẫu: `https://ecomerce-ldgroup-production.up.railway.app`
  
- [ ] **Variables đã set đầy đủ**
  - [ ] `DATABASE_URL` (auto-provided)
  - [ ] `JWT_SECRET` (32+ chars)
  - [ ] `JWT_REFRESH_SECRET` (32+ chars)
  - [ ] **`CORS_ORIGIN`** (Vercel URL)
  - [ ] `BANK_ACCOUNT_NUMBER`
  - [ ] `BANK_ACCOUNT_NAME`
  - [ ] `BANK_CODE`
  
- [ ] **Health check OK**
  - Test: `https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health`
  - Response: `{"status": "ok"}`

### ✅ FRONTEND (Vercel)

- [ ] **Project đã deploy thành công**
  - Check: Vercel Dashboard → Deployments → Status: "Ready"
  
- [ ] **Domain đã active**
  - URL: `https://deploy-ecom-l-dgroup.vercel.app`
  
- [ ] **Environment variable đã set**
  - [ ] **`VITE_API_URL`** = `https://YOUR-RAILWAY-URL.up.railway.app/api/v1`
  - Apply to: Production ✅, Preview ✅, Development ✅
  
- [ ] **Đã redeploy sau khi thêm variable**
  - Important: Environment variables chỉ apply sau khi redeploy
  
- [ ] **Build thành công**
  - Check: Deployment → Build Logs → No errors
  
- [ ] **Site hoạt động**
  - Test: Mở `https://deploy-ecom-l-dgroup.vercel.app`
  - Console: Không có lỗi JSON parse
  - Network tab: Request URL đúng Railway URL

---

## 🧪 TEST KỊCH BẢN

### Test 1: Backend Health
```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health
```
**Expected:**
```json
{"status":"ok","timestamp":"2025-10-17T..."}
```

### Test 2: CORS
Mở Console trên Vercel frontend:
```javascript
fetch('https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health')
  .then(r => r.json())
  .then(d => console.log('✅ CORS OK:', d))
  .catch(e => console.error('❌ CORS Error:', e))
```

### Test 3: API Connection
Mở Network tab (F12) trên frontend, reload trang:
- Tìm request đến `/api/v1/...`
- Check **Request URL** → Phải là Railway URL
- Check **Status** → Phải là 200 hoặc 401 (không phải 0, ERR_CONNECTION)
- Check **Response** → Phải là JSON, không phải HTML

### Test 4: Login Flow
1. Vào `/login`
2. Login với account test
3. Check Network tab:
   - Request to `/api/v1/auth/login`
   - Response: `{"success": true, "data": {...}}`
4. Redirect về dashboard
5. Dashboard load data thành công

---

## 🚨 COMMON ISSUES

### Issue 1: "CORS policy blocked"
```
Access to fetch at 'https://xxx.railway.app/api/v1/...' from origin 'https://xxx.vercel.app' 
has been blocked by CORS policy
```

**Fix:**
- Railway → Variables → Check `CORS_ORIGIN`
- Phải có chính xác Vercel URL
- Không có khoảng trắng thừa
- Không có dấu `/` cuối URL

### Issue 2: "Failed to fetch"
```
TypeError: Failed to fetch
```

**Fix:**
- Check Railway backend có đang chạy không
- Test health endpoint
- Check Railway logs for errors

### Issue 3: "JSON.parse error" (vấn đề hiện tại)
```
SyntaxError: JSON.parse: unexpected character at line 1 column 1
```

**Fix:**
- Vercel → Environment Variables → Add `VITE_API_URL`
- Vercel → Redeploy
- Clear browser cache

### Issue 4: "401 Unauthorized"
```
{"success": false, "message": "Unauthorized"}
```

**Fix:**
- Đây KHÔNG phải lỗi connection
- Đây là lỗi authentication (thiếu token hoặc token expired)
- Logout và login lại

---

## 🎯 SUCCESS CRITERIA

Khi deployment thành công, bạn phải có thể:

✅ Vào frontend Vercel không thấy lỗi console  
✅ Login được vào hệ thống  
✅ Thấy danh sách sản phẩm  
✅ Thêm sản phẩm vào giỏ hàng  
✅ Tạo đơn hàng  
✅ Upload ảnh sản phẩm (admin)  
✅ Xem dashboard (admin)  

---

## 📞 SUPPORT

Nếu vẫn gặp vấn đề:

1. **Check Railway Logs:**
   ```
   Railway Dashboard → Your Service → Logs
   ```
   Tìm errors, warnings

2. **Check Vercel Logs:**
   ```
   Vercel Dashboard → Deployment → Runtime Logs
   ```

3. **Check Browser Console:**
   ```
   F12 → Console tab → Tìm errors màu đỏ
   ```

4. **Check Network:**
   ```
   F12 → Network tab → Filter: Fetch/XHR
   ```
   Xem requests có đi đến đúng URL không

---

## 🔗 QUICK LINKS

- Railway Dashboard: https://railway.app
- Vercel Dashboard: https://vercel.com
- Frontend: https://deploy-ecom-l-dgroup.vercel.app
- Backend: https://YOUR-RAILWAY-URL.up.railway.app
- Health Check: https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health

---

**Last Updated:** 2025-10-17  
**Status:** Ready for deployment 🚀

