# 🚂 Hướng dẫn Deploy Backend lên Railway

## Bước 1: Tạo tài khoản Railway

1. Truy cập: https://railway.app
2. Click **"Start a New Project"** → Sign in with GitHub
3. Authorize Railway truy cập GitHub của bạn

## Bước 2: Tạo Project mới

1. Trong Railway Dashboard, click **"+ New Project"**
2. Chọn **"Deploy from GitHub repo"**
3. Chọn repository: `Ecomerce_LDGroup`
4. Railway sẽ tự động detect và tạo service

## Bước 3: Add MySQL Database

1. Trong project vừa tạo, click **"+ New"**
2. Chọn **"Database"** → **"Add MySQL"**
3. Railway sẽ tự động tạo MySQL instance
4. Railway sẽ tự động inject biến `DATABASE_URL` vào backend service

## Bước 4: Cấu hình Backend Service

### 4.1. Set Root Directory
1. Click vào **Backend Service** (tên repo của bạn)
2. Vào tab **"Settings"**
3. Tìm **"Root Directory"**
4. Nhập: `backend`
5. Click **"Save"**

### 4.2. Add Environment Variables
1. Vào tab **"Variables"**
2. Click **"+ New Variable"** và thêm từng biến:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-security
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-app.vercel.app
MAX_FILE_SIZE=5242880
```

**LƯU Ý:** `DATABASE_URL` sẽ tự động có sau khi add MySQL!

### 4.3. Generate JWT Secret
Chạy lệnh này local để tạo JWT secret ngẫu nhiên:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copy output và paste vào biến `JWT_SECRET`

## Bước 5: Deploy

1. Railway sẽ **TỰ ĐỘNG deploy** sau khi bạn lưu variables
2. Xem logs trong tab **"Deployments"**
3. Đợi 3-5 phút để build + deploy

## Bước 6: Lấy URL Backend

1. Vào tab **"Settings"**
2. Scroll xuống **"Networking"** → **"Public Networking"**
3. Click **"Generate Domain"**
4. Railway sẽ tạo URL dạng: `https://your-backend.up.railway.app`
5. **LƯU LẠI URL NÀY** - sẽ dùng cho frontend!

## Bước 7: Run Database Migration & Seed

### Option A: Qua Railway CLI (Khuyên dùng)
```bash
# Cài Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migration
railway run npx prisma migrate deploy

# Seed data (optional)
railway run npm run prisma:seed
```

### Option B: Thêm vào startCommand (Tự động)
Railway.json đã có `npx prisma migrate deploy` trong startCommand, nên sẽ tự động chạy khi deploy!

## Bước 8: Tạo Admin Account

### Option 1: Qua Railway CLI
```bash
railway run npm run admin:create
```

### Option 2: Thêm env variables và restart
Thêm vào Variables:
```env
ADMIN_EMAIL=admin@ldgroup.com
ADMIN_PASSWORD=Admin@123456
ADMIN_USERNAME=admin
```
Sau đó restart service.

## Bước 9: Test Backend

1. Mở URL backend: `https://your-backend.up.railway.app`
2. Thêm `/api` để xem Swagger docs: `https://your-backend.up.railway.app/api`
3. Test API health: `https://your-backend.up.railway.app/health`

## ✅ Checklist Deploy

- [ ] Repository đã push lên GitHub
- [ ] Railway project đã tạo
- [ ] MySQL database đã add
- [ ] Root directory = `backend`
- [ ] Environment variables đã set đầy đủ
- [ ] Domain đã generate
- [ ] Migration đã chạy thành công
- [ ] Seed data đã chạy (nếu cần)
- [ ] Admin account đã tạo
- [ ] Test API thành công

## 📊 Theo dõi Usage & Cost

1. Vào tab **"Metrics"** để xem:
   - CPU usage
   - Memory usage
   - Request count

2. Vào **"Usage"** để xem:
   - Cost estimate
   - Trial credit còn lại
   - **Trial $5 sẽ hết sau ~5-7 ngày**

## 🔄 Automatic Deployment

Railway tự động deploy khi bạn:
1. Push code lên GitHub (branch `main`)
2. Update environment variables
3. Manually trigger trong tab "Deployments"

## 🐛 Troubleshooting

### Build failed?
- Check logs trong tab "Deployments"
- Verify `backend` folder structure
- Check package.json scripts

### Database connection error?
- Verify `DATABASE_URL` có trong Variables
- Check MySQL service đang running
- Xem logs để debug

### Port error?
- Railway tự động bind PORT, không cần config
- Backend phải listen trên `process.env.PORT || 3000`

### Migration failed?
- Run manually: `railway run npx prisma migrate deploy`
- Check database schema compatibility
- Xem Prisma logs

## 💰 Chi phí

```
Trial: $5 credit (one-time)
Ước tính hết sau: 5-7 ngày

Sau khi hết trial:
- Backend (512MB): ~$5-8/tháng
- MySQL (512MB): ~$3-5/tháng
- TỔNG: ~$8-13/tháng
```

## 🔗 Links hữu ích

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Railway CLI: https://docs.railway.app/develop/cli
- Prisma Docs: https://www.prisma.io/docs
