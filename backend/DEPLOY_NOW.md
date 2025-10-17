# 🚀 DEPLOY NGAY - Quick Start Guide

## ✅ Đã Sẵn Sàng

Tất cả production fixes đã hoàn thành! Bạn chỉ cần 3 bước:

---

## 📝 BƯỚC 1: Commit & Push (1 phút)

```bash
# Đảm bảo đang ở thư mục backend
cd backend

# Add tất cả changes
git add .

# Commit
git commit -m "Production ready: Security fixes + Railway deployment config"

# Push lên GitHub
git push origin main
```

---

## 🚂 BƯỚC 2: Deploy lên Railway (5 phút)

### 2.1. Tạo Project

1. Vào https://railway.app
2. Login với GitHub
3. Click **"New Project"**
4. Chọn **"Deploy from GitHub repo"**
5. Chọn repository: `Ecomerce_LDGroup`
6. Railway tự động detect và deploy

### 2.2. Add MySQL Database

1. Trong project, click **"+ New"**
2. Chọn **"Database"** → **"Add MySQL"**
3. Đợi MySQL provision (30 giây)
4. `DATABASE_URL` sẽ tự động inject vào backend service

### 2.3. Add Environment Variables

1. Click vào **Backend Service** (tên: backend hoặc Ecomerce_LDGroup)
2. Tab **"Variables"**
3. **MỞ FILE:** `RAILWAY_ENV_VARIABLES.txt`
4. **Copy-paste từng dòng** vào Railway Variables

**⚠️ LƯU Ý:**
- Railway sẽ tự động redeploy sau khi add variables
- Đừng thêm `DATABASE_URL` (đã có tự động)
- **SAU KHI DEPLOY FRONTEND:** Update `CORS_ORIGIN`

---

## 🔍 BƯỚC 3: Verify Deployment (2 phút)

### 3.1. Get Railway Domain

1. Click vào service → **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Lưu domain: `https://your-app.up.railway.app`

### 3.2. Test Health Check

```bash
# Thay YOUR-DOMAIN bằng Railway domain
curl https://YOUR-DOMAIN.up.railway.app/api/v1/health
```

**Expected:**
```json
{
  "status": "ok",
  "database": { "status": "connected" }
}
```

### 3.3. Configure SePay Webhook

1. Vào SePay Dashboard: https://my.sepay.vn
2. **Settings** → **Webhook**
3. **URL:** `https://YOUR-DOMAIN.up.railway.app/api/v1/payment/sepay-webhook`
4. **Method:** POST
5. **Authorization:** `Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=`
6. Click **"Test Webhook"**

---

## ✅ Deployment Checklist

- [ ] Code committed & pushed to GitHub
- [ ] Railway project created
- [ ] MySQL database added
- [ ] Environment variables pasted (từ RAILWAY_ENV_VARIABLES.txt)
- [ ] Build successful (check Deployments tab)
- [ ] Health check returns OK
- [ ] Domain generated
- [ ] SePay webhook configured

---

## 📁 Files Quan Trọng

### Dành cho deploy:
- **`RAILWAY_ENV_VARIABLES.txt`** ← Copy-paste vào Railway
- **`RAILWAY_DEPLOY_GUIDE.md`** ← Hướng dẫn chi tiết
- **`.env.production`** ← Backup (không commit)

### Tham khảo:
- **`PRODUCTION_DEPLOY.md`** ← Deploy guide cho các platform khác
- **`PRODUCTION_READY_SUMMARY.md`** ← Tổng kết tất cả fixes

---

## 🔧 Sau Khi Deploy Frontend

Khi frontend đã deploy lên Vercel/Netlify:

1. Vào Railway → Backend Service → **Variables**
2. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
3. Railway tự động redeploy

---

## 🚨 Troubleshooting

### Build Failed?

**Check Railway Logs:**
1. Click vào service → **Deployments**
2. Click latest deployment → **View Logs**

**Common Issues:**
- Missing env variables → Add từ RAILWAY_ENV_VARIABLES.txt
- Database not connected → Ensure MySQL service is running
- Prisma errors → Railway should auto-run migrations

### App Crashed?

**Check:**
1. All env variables set correctly
2. MySQL service is running
3. Check logs for errors

**Fix:**
- Settings → **Restart**
- Hoặc push code lại để trigger redeploy

---

## 🎯 Expected Results

Sau khi deploy thành công:

✅ Backend URL: `https://your-app.up.railway.app`
✅ Health Check: `https://your-app.up.railway.app/api/v1/health`
✅ API Endpoints: `https://your-app.up.railway.app/api/v1/*`
✅ Database: Connected
✅ Cron Jobs: Running every 5 minutes
✅ Security: CORS, Helmet, Rate Limiting active

---

## 📊 Your Production Config

**✅ Configured:**
- JWT Secrets: Generated (32-byte secure)
- SePay API Key: H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=
- Bank Account: BIDV - 6201235752 (DIEP DUC LAI)
- Virtual Account: 96247LAI712004
- Commission Rates: F1=10%, F2=4%, F3=2%

**⚠️ Cần Update:**
- CORS_ORIGIN: Sau khi deploy frontend

---

## 🎉 That's It!

3 bước đơn giản:
1. ✅ Commit & Push
2. ✅ Deploy Railway + Add MySQL + Add Env Variables
3. ✅ Test & Configure SePay

**Tổng thời gian: ~10 phút**

Good luck! 🚀
