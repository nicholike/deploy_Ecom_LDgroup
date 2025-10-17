# 🔧 DATABASE_URL Manual Fix - Step by Step

Nếu auto-link không work, làm theo hướng dẫn này để add `DATABASE_URL` thủ công.

---

## 📋 Checklist - Kiểm Tra Trước

Vào Railway Dashboard và verify:

### ✅ Check 1: MySQL Service Tồn Tại?

1. Open Railway project
2. Bạn có thấy **2 services** không?
   - **Backend service** (từ GitHub repo)
   - **MySQL service** (database icon)

**❌ NẾU KHÔNG CÓ MYSQL:**
- Click **"+ New"** → **"Database"** → **"Add MySQL"**
- Chờ status = **"Active"** (màu xanh)

---

### ✅ Check 2: MySQL Đang Chạy?

1. Click vào **MySQL service**
2. Check status ở góc trên
3. Phải là **"Active"** (màu xanh)

**❌ NẾU FAILED/CRASHED:**
- Click **"Settings"** → **"Restart"**
- Hoặc delete và recreate MySQL service

---

### ✅ Check 3: DATABASE_URL Có Trong Backend Variables?

1. Click vào **Backend service**
2. Tab **"Variables"**
3. Scroll qua list variables
4. Tìm `DATABASE_URL`

**❌ NẾU KHÔNG CÓ:**
- Làm theo phần "Manual Fix" bên dưới

---

## 🛠️ MANUAL FIX - Add DATABASE_URL Thủ Công

Nếu Railway không tự động link, làm thủ công:

### Step 1: Get MySQL Connection String

1. Click vào **MySQL service**
2. Tab **"Connect"** hoặc **"Variables"**
3. Tìm và **COPY** variable `DATABASE_URL`
   - Format: `mysql://root:PASSWORD@mysql.railway.internal:3306/railway`
4. Copy toàn bộ connection string

**💡 TIP:** Click vào icon copy bên cạnh DATABASE_URL

---

### Step 2: Add to Backend Service

1. Click vào **Backend service**
2. Tab **"Variables"**
3. Click **"+ New Variable"** button
4. Name: `DATABASE_URL`
5. Value: **PASTE** connection string vừa copy
6. Click **"Add"**

**Example:**
```
Name: DATABASE_URL
Value: mysql://root:xxxxxxxxxxxx@mysql.railway.internal:3306/railway
```

---

### Step 3: Trigger Redeploy

Railway sẽ tự động redeploy khi bạn thêm variable, nhưng nếu không:

1. Tab **"Deployments"**
2. Click **"⋮"** menu (3 dots) trên latest deployment
3. Click **"Redeploy"**
4. Hoặc click **"Deploy"** button ở góc trên

---

### Step 4: Monitor Logs

1. Tab **"Logs"**
2. Watch real-time logs
3. Tìm các dòng:

**✅ SUCCESS:**
```
✅ Prisma schema loaded from prisma/schema.prisma
✅ Datasource "db": MySQL database
✅ Prisma Client generated successfully
✅ Running database migrations...
✅ Migrations completed successfully
✅ Application starting on port 3000
🚀 MLM E-commerce Backend is running!
```

**❌ FAIL (vẫn lỗi DATABASE_URL):**
```
Error: Environment variable not found: DATABASE_URL
```

→ Quay lại Step 2, verify DATABASE_URL đã add chưa

---

## 🔍 Verify Fix Worked

### Check 1: Variables Tab

Backend → Variables → Có `DATABASE_URL` với value là connection string

### Check 2: Logs Tab

Logs show "Backend is running!" không còn error

### Check 3: Test API

```bash
# Replace with your domain
curl https://your-backend.up.railway.app/api/v1/health
```

**Expected response:**
```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "responseTime": "5ms"
  }
}
```

---

## 🐛 Vẫn Lỗi? Troubleshooting

### Error: "Can't reach database server"

**Nguyên nhân:** MySQL service chưa chạy hoặc connection string sai

**Fix:**
1. Verify MySQL service status = **"Active"**
2. Restart MySQL service
3. Get fresh DATABASE_URL từ MySQL service
4. Update lại DATABASE_URL trong backend

---

### Error: "Access denied for user 'root'"

**Nguyên nhân:** Password trong DATABASE_URL không đúng

**Fix:**
1. Vào MySQL service → Variables
2. Copy fresh `DATABASE_URL` (Railway có thể đã thay đổi password)
3. Update lại trong backend service

---

### Backend Keeps Crashing

**Check:**
1. MySQL service status = **"Active"**?
2. DATABASE_URL format đúng chưa?
   - Phải bắt đầu `mysql://`
   - Có username, password, host, port, database name

**Fix:**
- Delete và recreate MySQL service
- Get new DATABASE_URL
- Add vào backend

---

## 📝 Alternative: Use Reference Variable

Thay vì hardcode connection string, dùng reference:

### Step 1: Add Reference Variable

Backend → Variables → Add:
```
Name: DATABASE_URL
Value: ${{MySQL.DATABASE_URL}}
```

**Giải thích:**
- `${{MySQL.DATABASE_URL}}` = reference đến MySQL service's DATABASE_URL
- Railway tự động resolve thành connection string thật
- Nếu MySQL password change, tự động update

---

## 🎯 Summary - Quick Steps

```bash
1. MySQL Service → Connect → Copy DATABASE_URL
   mysql://root:PASSWORD@mysql.railway.internal:3306/railway

2. Backend Service → Variables → + New Variable
   Name: DATABASE_URL
   Value: <paste connection string>

3. Click Add → Wait for redeploy (~2 mins)

4. Check Logs → Look for "Backend is running!"

5. Test: curl https://your-backend.up.railway.app/api/v1/health
```

---

## 💡 Why Manual Fix Needed?

Railway auto-linking đôi khi không work do:
- Services created in wrong order
- Railway workspace permissions
- Project configuration issues
- Region/network issues

**Manual fix = 100% reliable!**

---

## ✅ After Fix

Backend sẽ:
- ✅ Connect to MySQL successfully
- ✅ Run migrations automatically
- ✅ Start and accept requests
- ✅ Respond to health checks

---

**🎉 Done! Backend should be running now!**

Test your API and deploy frontend next!
