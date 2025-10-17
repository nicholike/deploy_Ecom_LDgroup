# 🚂 Railway Deployment Guide

## 📋 Quick Info

**Your Production Config:**
- ✅ JWT Secrets: Generated
- ✅ SePay API Key: Configured
- ✅ Bank Account: BIDV - DIEP DUC LAI (6201235752)
- ✅ Virtual Account: 96247LAI712004
- ⚠️ CORS_ORIGIN: **Cần update sau khi deploy frontend**
- ⚠️ DATABASE_URL: **Railway sẽ tự động inject**

---

## 🚀 Deploy Steps (10 phút)

### 1. Chuẩn bị Repository

```bash
# Commit tất cả changes
git add .
git commit -m "Production ready with security fixes"
git push origin main
```

### 2. Deploy trên Railway

#### 2.1. Tạo Project mới

1. Vào https://railway.app
2. Click **"New Project"**
3. Chọn **"Deploy from GitHub repo"**
4. Chọn repository: `Ecomerce_LDGroup`
5. Railway sẽ tự động detect và deploy

#### 2.2. Add MySQL Database

1. Trong Railway project, click **"+ New"**
2. Chọn **"Database"** → **"Add MySQL"**
3. Railway sẽ tự động:
   - Tạo MySQL instance
   - Generate `DATABASE_URL`
   - Inject vào environment của backend service

#### 2.3. Configure Environment Variables

Click vào **Backend Service** → **Variables** tab, add các variables sau:

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# JWT (✅ Already generated)
JWT_SECRET=kYmdf+wj1kCxpnSAnQII9Dw6ZDKPk51cHrnnzmj+lL4=
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=sGRb/7+24LLzQRUrTPsy5vrvRx72IL+h6Do6ewSdq0s=
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS (⚠️ UPDATE sau khi deploy frontend)
CORS_ORIGIN=https://your-frontend-domain.vercel.app

# SePay Payment
SEPAY_API_KEY=H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
BANK_NAME=BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam
SEPAY_VA_NUMBER=96247LAI712004
SEPAY_VA_ACCOUNT_NAME=Diep Lai

# Commission
DEFAULT_COMMISSION_RATE_F1=10
DEFAULT_COMMISSION_RATE_F2=4
DEFAULT_COMMISSION_RATE_F3=2
DEFAULT_COMMISSION_RATE_F4=0

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

**Lưu ý:**
- `DATABASE_URL` sẽ tự động có khi bạn add MySQL service
- Không cần add thủ công

#### 2.4. Configure Build Settings

Railway thường tự động detect, nhưng nếu cần custom:

**Settings → Build:**
- **Build Command:** `npm run build && npx prisma generate`
- **Start Command:** `npx prisma migrate deploy && npm run start:prod`
- **Root Directory:** `backend` (nếu monorepo)

#### 2.5. Generate Domain

1. Click **Settings** tab
2. Trong **Networking** section, click **Generate Domain**
3. Railway sẽ tạo domain: `https://your-app.up.railway.app`
4. **LƯU LẠI DOMAIN NÀY** để config CORS và SePay webhook

---

## 🔧 Post-Deployment Setup

### 3. Update CORS Origin

Sau khi có domain backend:

1. Vào **Variables** tab
2. Update `CORS_ORIGIN`:
   ```
   https://your-frontend-domain.vercel.app,https://your-backend.up.railway.app
   ```
3. Railway sẽ tự động redeploy

### 4. Run Database Migrations

Railway sẽ tự động chạy migrations khi start (đã config trong start command).

Nếu cần chạy manual:

1. Click vào service → **Settings** → **Deploy**
2. Hoặc dùng Railway CLI:
   ```bash
   railway run npx prisma migrate deploy
   ```

### 5. Configure SePay Webhook

1. Vào SePay Dashboard: https://my.sepay.vn
2. Settings → Webhook
3. Nhập URL: `https://your-backend.up.railway.app/api/v1/payment/sepay-webhook`
4. **Method:** POST
5. **Authorization Header:** `Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=`
6. Test webhook

---

## ✅ Verify Deployment

### Test Health Check

```bash
# Replace with your Railway domain
curl https://your-backend.up.railway.app/api/v1/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T...",
  "uptime": 123.456,
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

### Test CORS

```bash
# Should be blocked
curl -H "Origin: https://evil.com" \
  https://your-backend.up.railway.app/api/v1/health

# Should work (after updating CORS_ORIGIN)
curl -H "Origin: https://your-frontend-domain.vercel.app" \
  https://your-backend.up.railway.app/api/v1/health
```

### Test Authentication

```bash
# Should return 401
curl https://your-backend.up.railway.app/api/v1/users
```

### Test SePay Webhook

```bash
# Should return unauthorized (good!)
curl -X POST https://your-backend.up.railway.app/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Response should be:
# {"success":false,"message":"Unauthorized - Invalid API key"}
```

---

## 🔍 Monitoring on Railway

### View Logs

1. Click vào service
2. Tab **Deployments** → Click latest deployment
3. Click **View Logs**

**Watch for:**
- ✅ `🚀 MLM E-commerce Backend is running!`
- ✅ `✅ Security headers enabled`
- ✅ `✅ CORS enabled for origins: ...`
- ✅ `🔍 Running scheduled cleanup...` (cron jobs)

### Database Metrics

1. Click vào **MySQL service**
2. Tab **Metrics** - xem CPU, Memory, Storage

### Set up Notifications

1. **Settings** → **Webhooks**
2. Add Slack/Discord webhook để nhận alerts khi:
   - Deploy failed
   - Service crashed
   - High resource usage

---

## 🚨 Troubleshooting

### Build Failed

**Error:** "Cannot find module..."
```bash
# Fix: Ensure dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

**Error:** "Prisma Client not generated"
```bash
# Fix: Update build command to include prisma generate
# Build Command: npm run build && npx prisma generate
```

### Database Connection Failed

**Check:**
1. MySQL service is running
2. `DATABASE_URL` variable exists (Railway auto-injects)
3. Run migrations: `railway run npx prisma migrate deploy`

### App Crashed

**Check logs for:**
- Environment validation errors
- Missing required env variables
- Database connection issues

**Fix:**
1. Verify all env variables are set correctly
2. Check Railway MySQL service is running
3. Restart service: **Settings** → **Restart**

### Webhook Not Working

**Check:**
1. SePay webhook URL is correct
2. Authorization header format: `Apikey YOUR_KEY` (no Bearer)
3. Check logs for webhook requests
4. Verify SEPAY_API_KEY matches in both .env and SePay dashboard

---

## 📊 Railway Environment Variables Checklist

Copy-paste này vào Railway Variables tab:

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

JWT_SECRET=kYmdf+wj1kCxpnSAnQII9Dw6ZDKPk51cHrnnzmj+lL4=
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=sGRb/7+24LLzQRUrTPsy5vrvRx72IL+h6Do6ewSdq0s=
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

CORS_ORIGIN=YOUR_FRONTEND_DOMAIN_HERE

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

## 🎯 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] MySQL database added
- [ ] Environment variables configured
- [ ] Build completed successfully
- [ ] Health check returns 200
- [ ] Database connected
- [ ] CORS origin updated
- [ ] SePay webhook configured
- [ ] Cron jobs running (check logs)
- [ ] Test payment flow end-to-end

---

## 📝 Important URLs

After deployment, save these:

1. **Backend API:** `https://your-backend.up.railway.app`
2. **Health Check:** `https://your-backend.up.railway.app/api/v1/health`
3. **API Docs:** `https://your-backend.up.railway.app/api/docs` (if enabled)
4. **SePay Webhook:** `https://your-backend.up.railway.app/api/v1/payment/sepay-webhook`

---

## 🔐 Security Notes

- ✅ JWT secrets are cryptographically secure (32 bytes)
- ✅ CORS will block unauthorized domains
- ✅ Rate limiting prevents DDoS (100 req/min)
- ✅ Helmet adds security headers automatically
- ✅ SePay webhook requires API key authentication
- ✅ Environment validation prevents invalid config

---

## 🎉 You're Live!

Backend is now running on Railway with:
- ✅ MySQL database
- ✅ Auto-scaling
- ✅ HTTPS enabled
- ✅ Monitoring
- ✅ Auto-deployments on push

**Next Steps:**
1. Deploy frontend to Vercel
2. Update CORS_ORIGIN with frontend domain
3. Test full payment flow
4. Set up monitoring alerts

Good luck! 🚀
