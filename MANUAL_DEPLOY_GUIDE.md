# 🚀 Manual Railway Deployment Guide

Hướng dẫn deploy backend lên Railway hoàn toàn thủ công qua Dashboard.

---

## 📋 Prerequisites

- Tài khoản Railway (đã đăng nhập)
- Code đã push lên GitHub
- Thông tin SePay và ngân hàng

---

## 🚀 Step-by-Step Deployment

### Step 1: Tạo Project Mới

1. Vào: https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Chọn repository: `nicholike/deploy_Ecom_LDgroup`
4. Railway sẽ tự động phát hiện và bắt đầu deploy

**⚠️ QUAN TRỌNG:**
- Vào **Settings** → **General**
- Set **Root Directory** = `backend`
- Không set thì Railway sẽ không tìm thấy code backend

---

### Step 2: Add MySQL Database

1. Trong project vừa tạo, click **"+ New"**
2. Chọn **"Database"**
3. Chọn **"Add MySQL"**
4. Railway tự động:
   - Tạo MySQL instance
   - Generate và inject `DATABASE_URL` vào backend service

---

### Step 3: Configure Environment Variables

1. Click vào **Backend Service** (service vừa deploy)
2. Chọn tab **"Variables"**
3. Click **"+ New Variable"** hoặc **"Raw Editor"**

Copy và paste các variables sau:

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# JWT Secrets (⚠️ GENERATE MỚI - xem bên dưới)
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=YOUR_GENERATED_REFRESH_SECRET_HERE
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
CORS_ORIGIN=*

# SePay Payment
SEPAY_API_KEY=H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
BANK_NAME=BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam
SEPAY_VA_NUMBER=96247LAI712004
SEPAY_VA_ACCOUNT_NAME=Diep Lai

# Commission Rates
DEFAULT_COMMISSION_RATE_F1=10
DEFAULT_COMMISSION_RATE_F2=4
DEFAULT_COMMISSION_RATE_F3=2
DEFAULT_COMMISSION_RATE_F4=0

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

**⚠️ Generate JWT Secrets:**
```bash
# Chạy local để generate secrets mới
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy kết quả vào JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy kết quả vào JWT_REFRESH_SECRET
```

4. Click **"Add"** hoặc **"Save"**
5. Railway sẽ tự động redeploy với env mới

**Note:** `DATABASE_URL` được Railway tự động inject, không cần thêm thủ công.

---

### Step 4: Generate Public Domain

1. Click vào **Backend Service**
2. Tab **"Settings"**
3. Section **"Networking"**
4. Click **"Generate Domain"**
5. Railway tạo URL: `https://your-app-name.up.railway.app`

**💾 LƯU LẠI DOMAIN NÀY!** Cần dùng cho:
- Frontend config
- CORS update
- SePay webhook

---

### Step 5: Monitor Deployment

1. Tab **"Deployments"** - xem build progress
2. Tab **"Logs"** - xem real-time logs
3. Chờ deployment hoàn thành (~2-3 phút)

**Logs thành công sẽ hiển thị:**
```
✅ Prisma Client generated
✅ Build completed successfully
✅ Running database migrations...
✅ Server starting on port 3000
🚀 MLM E-commerce Backend is running!
```

---

### Step 6: Verify Deployment

**Test Health Check:**
```bash
# Thay YOUR_DOMAIN bằng domain Railway vừa tạo
curl https://YOUR_DOMAIN.up.railway.app/api/v1/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": {
    "status": "connected",
    "responseTime": "5ms"
  },
  "service": {
    "name": "MLM E-commerce API",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

**Hoặc dùng script:**
```bash
./verify-deployment.sh
# Nhập domain khi được hỏi
```

---

### Step 7: Update CORS (Sau khi deploy frontend)

1. Quay lại **Variables** tab
2. Tìm variable `CORS_ORIGIN`
3. Update value:
   ```
   https://your-frontend.vercel.app,https://your-backend.up.railway.app
   ```
4. Save - Railway auto-redeploys

---

### Step 8: Configure SePay Webhook

1. Vào: https://my.sepay.vn
2. Login → **Settings** → **Webhook**
3. Configure:
   - **URL:** `https://YOUR_DOMAIN.up.railway.app/api/v1/payment/sepay-webhook`
   - **Method:** `POST`
   - **Authorization:** `Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=`
4. **Save** và **Test Webhook**

---

## ✅ Deployment Checklist

Dùng để track progress:

- [ ] Tạo Railway project từ GitHub repo
- [ ] Set Root Directory = `backend`
- [ ] Add MySQL database
- [ ] Generate JWT secrets mới
- [ ] Configure tất cả environment variables (24 vars)
- [ ] Generate public domain
- [ ] Deployment hoàn thành (check logs)
- [ ] Health check trả về 200 OK
- [ ] Database connected
- [ ] Update CORS với frontend domain
- [ ] Configure SePay webhook
- [ ] Test payment flow

---

## 🔧 Build & Start Configuration

Railway tự động đọc từ `backend/railway.json`:

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npx prisma migrate deploy && npm run start:prod
```

**Nếu cần override:**
- Vào **Settings** → **Deploy**
- Custom **Build Command** và **Start Command**

---

## 🐛 Troubleshooting

### Build Failed

**Symptoms:** Deployment status = Failed

**Check:**
1. **Logs** tab - tìm error message
2. Verify Root Directory = `backend`
3. Check `railway.json` syntax

**Common Issues:**
- Root directory không đúng → Set `backend`
- Dependencies thiếu → Check `package.json`
- Prisma generation failed → Check `prisma/schema.prisma`

**Fix:**
- Update settings
- Click **"Redeploy"** button

---

### Database Connection Failed

**Symptoms:** Health check shows database disconnected

**Check:**
1. MySQL service đang chạy (check Railway dashboard)
2. `DATABASE_URL` variable tồn tại (auto-injected)

**Fix:**
```bash
# Run migrations manually
railway run npx prisma migrate deploy

# Or via Railway dashboard:
# Service → Settings → Deploy Logs
```

---

### App Crashed / Won't Start

**Symptoms:** Deployment thành công nhưng service crashed

**Check:**
1. **Logs** tab - tìm error
2. **Variables** tab - verify tất cả variables đã set
3. Environment validation errors

**Common Issues:**
- Missing environment variables
- Invalid JWT secrets
- Database connection timeout

**Fix:**
1. Verify all 24 env variables đã set
2. Check JWT_SECRET và JWT_REFRESH_SECRET không trống
3. Restart: **Settings** → **Restart**

---

### CORS Errors (từ Frontend)

**Symptoms:** Frontend không call được API

**Check:**
1. `CORS_ORIGIN` variable
2. Frontend domain có trong whitelist không

**Fix:**
```bash
# Update CORS_ORIGIN
CORS_ORIGIN=https://your-frontend.vercel.app,https://your-backend.up.railway.app
```

---

### SePay Webhook Not Working

**Symptoms:** Payments không update status

**Check:**
1. Webhook URL đúng chưa
2. Authorization header format: `Apikey YOUR_KEY`
3. Logs có request từ SePay không

**Test Webhook:**
```bash
curl -X POST https://YOUR_DOMAIN.up.railway.app/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -H "Apikey: H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=" \
  -d '{"test": "data"}'

# Should return success or specific error
```

---

## 📊 Monitoring

### View Logs
- Railway Dashboard → Service → **Logs** tab
- Real-time logs tự động update

### Check Metrics
- **Metrics** tab - CPU, Memory, Network usage
- Set up alerts nếu cần

### Database Metrics
- Click **MySQL service** → **Metrics**
- Monitor connections, storage, CPU

---

## 🔄 Redeploy

**Khi nào cần redeploy:**
- Update code và push to GitHub → Auto-redeploys
- Change environment variables → Auto-redeploys
- Manual redeploy: Click **"Redeploy"** button

---

## 🌐 Access Railway Project

**Dashboard:** https://railway.app/dashboard

**Useful Commands (Railway CLI - optional):**
```bash
# View logs
railway logs
railway logs --follow

# Check status
railway status

# View variables
railway variables --kv

# Restart service
railway restart

# Run command in Railway environment
railway run <command>
```

---

## 🎉 Deployment Complete!

Backend đã live tại: `https://YOUR_DOMAIN.up.railway.app`

**API Endpoints:**
- Health: `https://YOUR_DOMAIN.up.railway.app/api/v1/health`
- Auth: `https://YOUR_DOMAIN.up.railway.app/api/v1/auth/*`
- Products: `https://YOUR_DOMAIN.up.railway.app/api/v1/products/*`

**Next Steps:**
1. Deploy frontend to Vercel
2. Update frontend `VITE_API_URL`
3. Update backend `CORS_ORIGIN`
4. Test complete payment flow
5. Monitor logs và metrics

---

## 📞 Need Help?

**Check:**
- Railway Logs (real-time errors)
- Railway Status (service health)
- GitHub repo (code issues)

**Resources:**
- Railway Docs: https://docs.railway.app
- Backend README: `backend/START_HERE.md`
- Verification: `./verify-deployment.sh`

---

**Good luck! 🚀**

Your backend is production-ready with:
- ✅ Secure JWT authentication
- ✅ MySQL database
- ✅ SePay payment integration
- ✅ MLM commission system
- ✅ Auto-migrations
- ✅ Health monitoring
- ✅ Production security (CORS, Helmet, Rate limiting)
