# 🔧 Fix: DATABASE_URL Not Found Error

## ❌ Lỗi Gặp Phải

```
Error: Environment variable not found: DATABASE_URL.
  -->  prisma/schema.prisma:10
   |
 9 |   provider = "mysql"
10 |   url      = env("DATABASE_URL")
```

**Nguyên nhân:** Backend service chưa có MySQL database hoặc chưa được link với MySQL.

---

## ✅ Giải Pháp (5 phút)

### Step 1: Add MySQL Database

1. **Vào Railway Dashboard**
   - Open project: https://railway.app/dashboard
   - Click vào project của bạn

2. **Add MySQL Service**
   - Click **"+ New"** button (góc trên bên phải)
   - Chọn **"Database"**
   - Chọn **"Add MySQL"**
   - Railway sẽ tạo MySQL service

3. **Wait for MySQL to be ready**
   - Chờ MySQL service status = **"Active"** (màu xanh)
   - Thường mất ~30 giây

---

### Step 2: Link Services (QUAN TRỌNG!)

Railway cần biết backend service sử dụng MySQL service nào:

**Option A: Automatic Link (Recommended)**

1. Click vào **Backend Service** (service đang bị lỗi)
2. Tab **"Settings"**
3. Section **"Service Variables"**
4. Tìm section **"Referenced Services"** hoặc **"Connect"**
5. Click **"Connect"** hoặc **"+"**
6. Chọn **MySQL service** vừa tạo
7. Railway tự động inject `DATABASE_URL` vào backend

**Option B: Manual Link**

Nếu không thấy option Connect:

1. Click vào **MySQL Service**
2. Tab **"Connect"**
3. Copy **Connection String** (MySQL URL)
4. Quay lại **Backend Service** → **Variables**
5. Add variable mới:
   ```
   DATABASE_URL=<paste_mysql_connection_string_here>
   ```

---

### Step 3: Verify DATABASE_URL

1. Vào **Backend Service** → **Variables** tab
2. Kiểm tra có variable `DATABASE_URL` chưa
3. Nếu có → Good! Railway đã link thành công
4. Value sẽ có dạng:
   ```
   mysql://root:password@mysql.railway.internal:3306/railway
   ```

**⚠️ LƯU Ý:**
- Nếu thấy `DATABASE_URL=${{MySQL.DATABASE_URL}}` → Đúng rồi!
- Đây là reference notation của Railway
- Railway sẽ tự động resolve thành connection string thật

---

### Step 4: Redeploy Backend

Railway sẽ tự động redeploy khi bạn link services, nhưng nếu không:

1. Vào **Backend Service**
2. Tab **"Deployments"**
3. Click **"Redeploy"** button (hoặc **"⋮"** menu → **"Redeploy"**)
4. Chờ deployment hoàn thành

---

## 🔍 Verify Success

Sau khi redeploy, check logs:

1. Tab **"Logs"**
2. Tìm các dòng:
   ```
   ✅ Prisma Client generated
   ✅ Running database migrations...
   ✅ Migrations completed
   ✅ Server starting on port 3000
   🚀 MLM E-commerce Backend is running!
   ```

3. Test health check:
   ```bash
   curl https://your-backend.up.railway.app/api/v1/health
   ```

---

## 🐛 Troubleshooting

### Vẫn Lỗi "DATABASE_URL not found"

**Check:**
1. MySQL service đã **Active** chưa?
2. Backend và MySQL có trong **cùng 1 Railway Project** không?
3. Variable `DATABASE_URL` có xuất hiện trong Backend Variables không?

**Fix:**
- Redeploy lại backend service
- Xóa và add lại MySQL service
- Kiểm tra logs của MySQL service

---

### Lỗi "Connection Timeout" hoặc "Can't connect to MySQL"

**Check:**
1. MySQL service có đang chạy không? (Status = Active)
2. DATABASE_URL có đúng format không?

**Fix:**
```bash
# Via Railway CLI (optional)
railway run npx prisma migrate deploy
```

Hoặc restart MySQL service:
- Click MySQL service → Settings → Restart

---

### Lỗi "Database 'railway' does not exist"

**Fix:**
Railway MySQL tự động tạo database `railway`, nhưng nếu không có:

1. Click MySQL service → **Variables**
2. Kiểm tra `MYSQL_DATABASE` = `railway`
3. Nếu khác, update DATABASE_URL cho match

---

## 📋 Checklist

Sau khi fix, verify:

- [ ] MySQL service status = **Active**
- [ ] Backend Variables có `DATABASE_URL`
- [ ] Backend deployment success (không còn error)
- [ ] Logs show "Migrations completed"
- [ ] Health check trả về 200 OK
- [ ] Database status trong health check = "connected"

---

## 💡 Tips

**Để tránh lỗi này trong tương lai:**

1. **Luôn add MySQL TRƯỚC** khi deploy backend
2. **Verify DATABASE_URL** có trong Variables trước khi deploy
3. **Check MySQL status** = Active trước khi start backend
4. **Dùng Railway's service references** thay vì hardcode connection strings

---

## 🎯 Quick Fix Summary

```bash
1. Railway Dashboard → Project
2. Click "+ New" → Database → MySQL
3. Wait for MySQL = Active
4. Backend Service → Settings → Connect → Select MySQL
5. Verify DATABASE_URL in Backend Variables
6. Redeploy Backend
7. Check Logs → Should see "Running!"
```

**Estimated time:** 3-5 minutes

---

## 📞 Still Having Issues?

Check Railway logs:
```bash
# Via CLI
railway logs

# Or via Dashboard
Backend Service → Logs tab
```

Common issues:
- MySQL not fully started → Wait 1-2 minutes
- Services in different projects → Move to same project
- Variables not refreshed → Restart backend service

---

**Good luck! 🚀**

After fixing, your backend should start successfully!
