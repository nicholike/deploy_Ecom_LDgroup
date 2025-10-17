# 🚀 Production Deployment Guide

## ✅ What's Been Fixed for Production

All critical security and production-readiness issues have been addressed:

### 🔒 Security Fixes (CRITICAL)
- ✅ **CORS Configuration** - Now uses specific allowed origins from env (no more `origin: true`)
- ✅ **Test Webhook Removed** - Public test endpoint completely removed
- ✅ **SePay Webhook Auth** - Enforced in production (returns 401 if API key mismatch)
- ✅ **Helmet Security Headers** - CSP, XSS protection, etc.
- ✅ **Rate Limiting** - 100 requests/minute per IP (configurable)

### 🛠️ Infrastructure Added
- ✅ **Cron Jobs Enabled** - Auto-cleanup for expired orders/pending orders (every 5 min)
- ✅ **Health Check Endpoints** - `/health`, `/health/ready`, `/health/live`
- ✅ **Environment Validation** - App won't start with missing/invalid env vars
- ✅ **.env.example Updated** - Production-ready template

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables (`.env`)

```bash
# Copy .env.example and update with production values
cp .env.example .env
```

**Required Changes:**

```env
# ⚠️ MUST CHANGE
NODE_ENV=production

# ⚠️ Generate secure secrets (32+ chars):
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=<your-generated-secret-here>
JWT_REFRESH_SECRET=<different-generated-secret-here>

# ⚠️ Production domains ONLY
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# ⚠️ Database
DATABASE_URL="mysql://user:password@host:3306/database"

# ⚠️ SePay Payment (REQUIRED)
SEPAY_API_KEY=your-sepay-api-key
BANK_ACCOUNT_NUMBER=your-account-number
BANK_ACCOUNT_NAME=YOUR_NAME
BANK_CODE=BIDV
BANK_NAME=BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam
```

### 2. Security Checklist

- [ ] `NODE_ENV=production`
- [ ] JWT secrets are 32+ characters (use crypto.randomBytes)
- [ ] CORS_ORIGIN set to production domains only
- [ ] SEPAY_API_KEY configured
- [ ] Database credentials are secure
- [ ] `.env` is in `.gitignore` (never commit secrets!)

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:prod

# Verify database connection
npm run prisma:studio  # Check tables are created
```

### 4. Build & Test

```bash
# Install dependencies
npm ci --production=false

# Build application
npm run build

# Test the build
NODE_ENV=production node dist/main.js
```

**Expected output:**
```
🔧 Starting bootstrap...
✅ App created
🔧 Setting up security headers...
✅ Security headers enabled
...
✅ CORS enabled for origins: [ 'https://yourdomain.com' ]
...
🚀 MLM E-commerce Backend is running!
📡 Server: http://localhost:3000
```

---

## 🔧 Deployment Steps

### Option 1: Railway / Render / Heroku

1. **Set Environment Variables** in platform dashboard
2. **Connect GitHub repo**
3. **Set build command:** `npm run build`
4. **Set start command:** `npm run start:prod`
5. **Deploy**

### Option 2: VPS / Docker

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start dist/main.js --name mlm-ecommerce

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

#### Using Docker

```bash
# Build Docker image
docker build -t mlm-ecommerce .

# Run container
docker run -d \
  --name mlm-api \
  -p 3000:3000 \
  --env-file .env \
  mlm-ecommerce
```

---

## 🔍 Health Checks & Monitoring

### Health Check Endpoints

```bash
# Basic health check
curl https://yourdomain.com/api/v1/health

# Readiness check (for load balancers)
curl https://yourdomain.com/api/v1/health/ready

# Liveness check
curl https://yourdomain.com/api/v1/health/live
```

### Configure Load Balancer Health Checks

- **Path:** `/api/v1/health/ready`
- **Expected Status:** 200
- **Interval:** 30s
- **Timeout:** 5s

---

## 🛡️ Security Features Enabled

| Feature | Status | Description |
|---------|--------|-------------|
| CORS Protection | ✅ | Only allows specified domains |
| Rate Limiting | ✅ | 100 req/min per IP |
| Helmet Headers | ✅ | XSS, CSP, HSTS protection |
| Webhook Auth | ✅ | SePay API key verification |
| Input Validation | ✅ | Class-validator on all DTOs |
| JWT Authentication | ✅ | Secure token-based auth |
| Env Validation | ✅ | Fails on missing/invalid config |

---

## 🔄 Cron Jobs (Auto-Enabled)

| Job | Schedule | Purpose |
|-----|----------|---------|
| Pending Order Cleanup | Every 5 min | Expire unpaid orders after 30 min |
| Order Cleanup | Every 5 min | Cancel expired unpaid orders |

**Verify in logs:**
```
🔍 Running scheduled cleanup for expired pending orders...
✅ Scheduled cleanup completed
```

---

## 📊 Post-Deployment Verification

### 1. Test Health Endpoints
```bash
curl https://yourdomain.com/api/v1/health
# Should return: { "status": "ok", "database": { "status": "connected" } }
```

### 2. Test Authentication
```bash
# Should return 401
curl https://yourdomain.com/api/v1/users
```

### 3. Test CORS
```bash
# Should be allowed
curl -H "Origin: https://yourdomain.com" https://yourdomain.com/api/v1/health

# Should be blocked (if not in CORS_ORIGIN)
curl -H "Origin: https://evil.com" https://yourdomain.com/api/v1/health
```

### 4. Test Rate Limiting
```bash
# Run 101 requests quickly - last one should be 429 Too Many Requests
for i in {1..101}; do curl https://yourdomain.com/api/v1/health; done
```

### 5. Test SePay Webhook Auth
```bash
# Without API key - should fail
curl -X POST https://yourdomain.com/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
# Should return: { "success": false, "message": "Unauthorized - Invalid API key" }
```

---

## 🚨 Monitoring & Alerts

### Recommended Monitoring

1. **Uptime Monitoring**
   - Use: Uptime Robot, Pingdom, or StatusCake
   - Monitor: `/api/v1/health/ready`

2. **Log Aggregation**
   - Use: Logtail, Papertrail, or CloudWatch
   - Watch for: `❌` errors, `⛔` security events

3. **Database Monitoring**
   - Watch: Connection pool usage
   - Alert on: Slow queries (>1s)

4. **Application Metrics**
   - Track: Request rate, response time
   - Alert on: High error rate (>5%)

### Critical Alerts to Setup

- Database connection failures
- Negative wallet balances (fraud detection)
- Failed payment webhooks
- Cron job failures
- High rate limit hits (DDoS detection)

---

## 🔧 Troubleshooting

### App Won't Start

**Error:** "Environment validation failed"
- **Fix:** Check `.env` file has all required variables
- **Fix:** Generate new JWT secrets with crypto.randomBytes

**Error:** "Database connection failed"
- **Fix:** Verify DATABASE_URL is correct
- **Fix:** Check database server is running and accessible

### Webhook Issues

**Error:** "SePay webhook unauthorized"
- **Fix:** Verify SEPAY_API_KEY matches SePay dashboard
- **Fix:** Check Authorization header format: `Apikey YOUR_KEY`

**Orders not created from payment**
- **Fix:** Check webhook logs for errors
- **Fix:** Verify pending order exists before payment
- **Fix:** Check bank transaction content format

### Performance Issues

**Slow response times**
- Check: Database query performance
- Check: Connection pool settings
- Consider: Redis caching for hot data

**High memory usage**
- Check: Cron jobs running correctly
- Check: Database connections are closed
- Consider: Increase server resources

---

## 📝 Rollback Plan

If deployment fails:

```bash
# Stop current deployment
pm2 stop mlm-ecommerce

# Rollback to previous version
git checkout <previous-commit>
npm ci
npm run build
pm2 restart mlm-ecommerce

# Or use PM2 rollback
pm2 reload ecosystem.config.js --update-env
```

---

## ✅ Production Deployment Checklist

- [ ] All environment variables set correctly
- [ ] JWT secrets are strong (32+ chars)
- [ ] CORS_ORIGIN is production domains only
- [ ] Database migrated successfully
- [ ] Build completed without errors
- [ ] Health checks passing
- [ ] SePay webhook configured
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] SSL/TLS certificate configured
- [ ] Logs being collected
- [ ] Team trained on deployment process

---

## 🎉 You're Ready to Deploy!

All security fixes and production features are now in place. Follow this guide carefully and your deployment should be smooth.

**Need Help?**
- Check logs: `pm2 logs mlm-ecommerce`
- Health status: `GET /api/v1/health`
- Database: `npm run prisma:studio`

Good luck! 🚀
