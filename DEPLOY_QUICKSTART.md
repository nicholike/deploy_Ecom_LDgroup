# 🚀 DEPLOY NHANH - RAILWAY + VERCEL

Hướng dẫn deploy nhanh nhất để demo ngay trong 15 phút!

## 📋 Chuẩn bị

### Bạn cần có:
- [x] GitHub account
- [x] Code đã push lên GitHub
- [x] Email để đăng ký Railway & Vercel

### Không cần:
- ❌ Thẻ tín dụng (dùng trial)
- ❌ Kiến thức DevOps
- ❌ Server/VPS

## ⏱️ Timeline

```
Bước 1-3: Deploy Backend (10 phút)
Bước 4-5: Deploy Frontend (5 phút)
Bước 6: Test (5 phút)
------------------------
TỔNG: ~20 phút
```

---

## 🚂 PHẦN 1: DEPLOY BACKEND LÊN RAILWAY

### Bước 1: Tạo tài khoản Railway (2 phút)

1. Truy cập: **https://railway.app**
2. Click **"Start a New Project"**
3. Sign in with GitHub
4. Authorize Railway

✅ Done! Bạn có **$5 trial credit**

### Bước 2: Deploy Backend (5 phút)

1. **New Project:**
   - Click **"+ New Project"**
   - Chọn **"Deploy from GitHub repo"**
   - Chọn repo: `Ecomerce_LDGroup`
   - Railway tự động tạo service

2. **Add MySQL Database:**
   - Click **"+ New"** trong project
   - Chọn **"Database"** → **"Add MySQL"**
   - Railway tự động inject `DATABASE_URL`

3. **Configure Backend Service:**
   - Click vào Backend service
   - Tab **"Settings"** → **"Root Directory"** → Nhập: `backend`
   - Tab **"Variables"** → Click **"+ New Variable"**

   **Thêm các biến sau:**
   ```env
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=PUT_YOUR_SECRET_HERE_MIN_32_CHARS
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://yourapp.vercel.app
   MAX_FILE_SIZE=5242880
   ```

   **Tạo JWT Secret:**
   ```bash
   # Chạy lệnh này local để tạo secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Generate Domain:**
   - Tab **"Settings"** → **"Networking"**
   - Click **"Generate Domain"**
   - Lưu lại URL: `https://xxx.up.railway.app`

5. **Deploy:**
   - Railway tự động deploy!
   - Tab **"Deployments"** → Xem logs
   - Đợi 3-5 phút

✅ Backend deployed!

### Bước 3: Setup Database (3 phút)

**Option A: Tự động (Khuyên dùng)**
- Railway đã chạy migration tự động qua `railway.json`
- Check logs để verify

**Option B: Thủ công (nếu cần)**
```bash
# Cài Railway CLI
npm i -g @railway/cli

# Login & link
railway login
railway link

# Run migration
railway run npx prisma migrate deploy

# Seed data (optional)
railway run npm run prisma:seed
```

**Test Backend:**
- Mở: `https://your-backend.up.railway.app/api`
- Nếu thấy Swagger docs → ✅ Success!

---

## ▲ PHẦN 2: DEPLOY FRONTEND LÊN VERCEL

### Bước 4: Import Project (2 phút)

1. Truy cập: **https://vercel.com**
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import repo: `Ecomerce_LDGroup`

### Bước 5: Configure & Deploy (3 phút)

1. **Root Directory:**
   - Click **"Edit"**
   - Nhập: `frontend`

2. **Environment Variables:**
   - Click **"Environment Variables"**
   - Add variable:
     ```
     Name:  VITE_API_URL
     Value: https://your-backend.up.railway.app/api/v1
     ```
   - ⚠️ Thay `your-backend.up.railway.app` bằng URL Railway thực tế!

3. **Deploy:**
   - Click **"Deploy"**
   - Đợi 2-3 phút
   - Lưu URL Vercel: `https://ecomerce-ldgroup.vercel.app`

✅ Frontend deployed!

### Bước 6: Update Backend CORS (1 phút)

1. Quay lại **Railway Dashboard**
2. Backend Service → Tab **"Variables"**
3. Tìm `FRONTEND_URL`
4. Update value = URL Vercel của bạn
5. Save → Backend tự động redeploy

---

## ✅ TEST & VERIFY

### 1. Test Backend API
```bash
# Health check
curl https://your-backend.up.railway.app/health

# API docs
https://your-backend.up.railway.app/api
```

### 2. Test Frontend
1. Mở: `https://your-app.vercel.app`
2. Test login (nếu đã tạo admin)
3. Test API calls (F12 → Network tab)

### 3. Check CORS
- Không có lỗi CORS trong Console → ✅ Good
- Nếu có lỗi → Check `FRONTEND_URL` trong Railway

---

## 🎯 TẠO ADMIN ACCOUNT

### Option 1: Railway CLI
```bash
railway run npm run admin:create
```

### Option 2: Thêm env variables
Trong Railway Backend → Variables:
```env
ADMIN_EMAIL=admin@ldgroup.com
ADMIN_PASSWORD=Admin@123456
ADMIN_USERNAME=admin
```
Restart service → Admin tự động tạo

---

## 💰 CHI PHÍ & THỜI GIAN DEMO

### Railway Trial:
```
Credit: $5 (one-time)
Backend: ~$0.60-0.80/ngày
MySQL:   ~$0.30-0.40/ngày
--------
Tổng:    ~$1/ngày

→ Demo được: 5-7 ngày
```

### Vercel:
```
✅ FREE vĩnh viễn!
✅ Không giới hạn bandwidth (với 400 users)
```

### Sau trial hết:
```
Railway: $10-13/tháng (nếu nạp tiền)
Vercel:  $0 (FREE)
------
TỔNG:    $10-13/tháng (~230-300k VND)
```

---

## 🐛 TROUBLESHOOTING

### Backend build failed?
- Check logs: Railway → Deployments → View logs
- Verify `backend` folder structure
- Check `railway.json` exists

### Database connection error?
- Verify MySQL service running
- Check `DATABASE_URL` in Variables
- Wait 30s after MySQL creation

### Frontend blank page?
- Check `VITE_API_URL` format: `https://xxx.railway.app/api/v1`
- Verify backend URL accessible
- Check browser Console (F12)

### CORS errors?
- Verify `FRONTEND_URL` = Vercel URL (exact match)
- No trailing slash: ✅ `https://app.vercel.app` ❌ `https://app.vercel.app/`
- Redeploy backend after changing CORS

### Migration not running?
```bash
# Manual run
railway run npx prisma migrate deploy

# Check migration status
railway run npx prisma migrate status
```

---

## 📊 MONITORING

### Railway:
- **Metrics tab:** CPU, RAM, Requests
- **Usage tab:** Cost estimate, credit remaining
- ⚠️ Theo dõi credit để biết khi nào hết trial

### Vercel:
- **Analytics:** Page views, performance
- **Deployments:** Build history, logs
- **Speed Insights:** Core Web Vitals

---

## 🔄 AUTO DEPLOYMENT

### Đã setup tự động:
✅ Push code → GitHub → Auto deploy (cả Railway & Vercel)
✅ PR merged → Auto deploy
✅ Environment changes → Auto redeploy

### Manual deploy:
- Railway: Deployments → "Deploy Now"
- Vercel: Deployments → "Redeploy"

---

## 🎉 DONE!

Bạn đã có:
- ✅ Backend API running on Railway
- ✅ MySQL database
- ✅ Frontend on Vercel (Global CDN)
- ✅ Auto deployment setup
- ✅ HTTPS enabled
- ✅ Ready to demo!

**URLs của bạn:**
- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-backend.railway.app/api/v1`
- API Docs: `https://your-backend.railway.app/api`

---

## 📚 NEXT STEPS

1. **Custom domain** (optional):
   - Vercel: Add domain in Settings
   - Railway: Add custom domain

2. **Monitor usage:**
   - Railway credit remaining
   - API response times
   - Error rates

3. **Backup database:**
   ```bash
   railway run npx prisma db pull
   ```

4. **When trial expires:**
   - Add payment method to Railway
   - Or migrate to VPS/other platform

---

## 🔗 QUICK LINKS

- **Railway Dashboard:** https://railway.app/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Detailed Backend Guide:** `backend/DEPLOY_RAILWAY.md`
- **Detailed Frontend Guide:** `frontend/DEPLOY_VERCEL.md`

---

## ❓ CẦN HỖ TRỢ?

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

**Vercel:**
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

**Prisma:**
- Docs: https://www.prisma.io/docs
- Discord: https://pris.ly/discord

---

**🎯 Chúc bạn deploy thành công!** 🚀
