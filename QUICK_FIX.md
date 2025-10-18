# ⚡ QUICK FIX - Vercel + Railway Connection

## 🎯 TÓM TẮT VẤN ĐỀ

Frontend Vercel đang gọi `localhost` thay vì Railway backend → Lỗi JSON parse

---

## ✅ 3 BƯỚC FIX (5 phút)

### 1️⃣ LẤY RAILWAY URL

```
Railway Dashboard → Your Backend Project → Settings → Networking → Generate Domain
```

Ví dụ: `https://ecomerce-ldgroup-production.up.railway.app`

---

### 2️⃣ CẬP NHẬT RAILWAY (Backend)

**Railway Dashboard → Variables → Add Variable:**

```bash
CORS_ORIGIN=https://deploy-ecom-l-dgroup.vercel.app
```

Đợi Railway redeploy (2-3 phút)

---

### 3️⃣ CẬP NHẬT VERCEL (Frontend)

**Vercel Dashboard → Settings → Environment Variables → Add:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api/v1` |

**Quan trọng:** 
- Thay `YOUR-RAILWAY-URL` bằng URL từ bước 1
- Phải có `/api/v1` ở cuối
- Apply cho: Production, Preview, Development

**Sau đó:**
```
Vercel Dashboard → Deployments → Click deployment mới nhất → Redeploy
```

---

## ✅ TEST

### Test Backend:
```
https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health
```
→ Phải trả về: `{"status": "ok"}`

### Test Frontend:
```
https://deploy-ecom-l-dgroup.vercel.app
```
→ Mở Console (F12) → Không còn lỗi JSON parse

---

## 🔥 NẾU VẪN LỖI

1. **Check biến đã được set chưa:**
   - Railway: Variables tab → thấy `CORS_ORIGIN`
   - Vercel: Settings → Environment Variables → thấy `VITE_API_URL`

2. **Check đã redeploy chưa:**
   - Railway: Tự động redeploy sau khi thêm biến
   - Vercel: **PHẢI** redeploy thủ công

3. **Check URL format:**
   - ✅ `https://domain.com/api/v1`
   - ❌ `https://domain.com/api/v1/` (thừa dấu /)
   - ❌ `http://localhost:3000/api/v1` (sai URL)

4. **Clear browser cache:**
   - Ctrl + Shift + Delete
   - Hard reload: Ctrl + F5

---

## 📞 URLS CẦN BIẾT

### Railway Backend URL mẫu:
```
https://ecomerce-ldgroup-production.up.railway.app
```

### Vercel Frontend URL (của bạn):
```
https://deploy-ecom-l-dgroup.vercel.app
```

### Full API URL (cho VITE_API_URL):
```
https://ecomerce-ldgroup-production.up.railway.app/api/v1
```

---

Xem hướng dẫn chi tiết tại: `FIX_VERCEL_RAILWAY_CONNECTION.md` 📖

