# 🚀 Deploy to Railway - Quick Start

## 1️⃣ Prerequisites

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

## 2️⃣ Run Auto-Deploy Script

```bash
# Run the automated deployment script
./deploy-railway.sh
```

Script sẽ tự động:
- ✅ Generate JWT secrets
- ✅ Create Railway project
- ✅ Add MySQL database
- ✅ Configure environment variables
- ✅ Deploy backend

## 3️⃣ Manual Deploy (Alternative)

Nếu muốn deploy thủ công:

```bash
# 1. Initialize Railway project
cd backend
railway init

# 2. Add MySQL
railway add -d mysql

# 3. Set environment variables (xem file .env.example)
railway variables set NODE_ENV=production
railway variables set PORT=3000
# ... (xem RAILWAY_DEPLOY_GUIDE.md để biết full list)

# 4. Deploy
railway up
```

## 4️⃣ Verify Deployment

```bash
# Check health
curl https://your-backend.up.railway.app/api/v1/health

# View logs
railway logs

# Check status
railway status
```

## 5️⃣ Update CORS (Sau khi deploy frontend)

```bash
railway variables set CORS_ORIGIN="https://your-frontend.vercel.app,https://your-backend.up.railway.app"
```

## 6️⃣ Configure SePay Webhook

1. Go to: https://my.sepay.vn
2. Settings → Webhook
3. URL: `https://your-backend.up.railway.app/api/v1/payment/sepay-webhook`
4. Method: POST
5. Authorization: `Apikey YOUR_SEPAY_API_KEY`

---

## 📚 Useful Commands

```bash
railway logs           # View logs
railway logs --follow  # Real-time logs
railway status         # Service status
railway variables      # List env vars
railway domain         # Get domain
railway restart        # Restart service
railway open           # Open in browser
```

## 🔧 Troubleshooting

### Build Failed
```bash
# Check logs
railway logs

# Redeploy
railway up --detach
```

### Database Connection Issues
```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Check MySQL service is running
railway status
```

### Environment Variables Missing
```bash
# List all variables
railway variables

# Set missing variable
railway variables set KEY=VALUE
```

---

**📖 Detailed Guide:** See `backend/RAILWAY_DEPLOY_GUIDE.md` for step-by-step instructions.

**🤖 Automation:** Use `./deploy-railway.sh` for one-command deployment.
