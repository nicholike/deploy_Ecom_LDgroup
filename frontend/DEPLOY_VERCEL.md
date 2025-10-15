# ▲ Hướng dẫn Deploy Frontend lên Vercel

## Bước 1: Tạo tài khoản Vercel

1. Truy cập: https://vercel.com
2. Click **"Sign Up"**
3. Chọn **"Continue with GitHub"**
4. Authorize Vercel truy cập GitHub

## Bước 2: Import Project

1. Trong Vercel Dashboard, click **"Add New..."** → **"Project"**
2. Tìm repository **"Ecomerce_LDGroup"**
3. Click **"Import"**

## Bước 3: Cấu hình Project

### 3.1. Framework Preset
- Vercel sẽ tự động detect: **Vite**
- ✅ Giữ nguyên

### 3.2. Root Directory
1. Click **"Edit"** ở Root Directory
2. Nhập: `frontend`
3. Vercel sẽ tự động update Build & Output settings

### 3.3. Build Settings (Tự động)
```
Build Command:     npm run build
Output Directory:  dist
Install Command:   npm install
```
✅ Giữ nguyên - Vercel tự động detect từ package.json

### 3.4. Environment Variables
⚠️ **QUAN TRỌNG:** Phải thêm TRƯỚC KHI deploy!

Click **"Environment Variables"** và thêm:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://your-backend.up.railway.app/api/v1` |

**LƯU Ý:**
- Thay `your-backend.up.railway.app` bằng URL Railway backend thực tế
- Phải có `/api/v1` ở cuối
- Ví dụ: `https://mlm-backend-production.up.railway.app/api/v1`

## Bước 4: Deploy

1. Click **"Deploy"**
2. Vercel sẽ:
   - Clone repo
   - Install dependencies
   - Build project
   - Deploy lên CDN toàn cầu
3. Đợi 2-3 phút

## Bước 5: Lấy URL Frontend

Sau khi deploy thành công:
1. Vercel sẽ tạo URL dạng: `https://ecomerce-ldgroup.vercel.app`
2. **LƯU LẠI URL NÀY**
3. Quay lại Railway backend và update `FRONTEND_URL`

## Bước 6: Update Backend CORS

1. Vào **Railway Dashboard**
2. Chọn **Backend Service** → Tab **"Variables"**
3. Tìm biến `FRONTEND_URL`
4. Update value = URL Vercel vừa lấy
5. Ví dụ: `https://ecomerce-ldgroup.vercel.app`
6. Click **"Save"** → Backend sẽ tự động redeploy

## Bước 7: Test Website

1. Mở URL Vercel: `https://your-app.vercel.app`
2. Test login với admin account
3. Test các chức năng cơ bản

## ✅ Checklist Deploy

- [ ] Repository đã push lên GitHub
- [ ] Vercel project đã import
- [ ] Root directory = `frontend`
- [ ] Environment variable `VITE_API_URL` đã set
- [ ] Deploy thành công
- [ ] Backend `FRONTEND_URL` đã update
- [ ] Test login thành công
- [ ] CORS working (không bị lỗi)

## 🔄 Automatic Deployment

Vercel tự động deploy khi:
1. ✅ Push code lên GitHub (branch `main`)
2. ✅ Merge Pull Request
3. ✅ Manual redeploy trong Dashboard

### Preview Deployments
- Mỗi Pull Request → Vercel tạo preview URL
- Test trước khi merge
- Rất hữu ích cho team!

## 🎨 Custom Domain (Tùy chọn)

### Dùng domain riêng:
1. Vào Project Settings → **"Domains"**
2. Click **"Add Domain"**
3. Nhập domain của bạn: `yourdomain.com`
4. Vercel sẽ hướng dẫn cấu hình DNS:
   - A record: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`
5. Đợi DNS propagate (~24h)

## 📊 Monitoring & Analytics

### Vào tab "Analytics":
- Page views
- Top pages
- Top referrers
- Performance metrics

### Vào tab "Speed Insights":
- Core Web Vitals
- Performance score
- Loading time

## 🐛 Troubleshooting

### Build failed?
**Lỗi thường gặp:**
```
✗ Failed to compile
```

**Giải pháp:**
1. Check logs trong Vercel deployment
2. Test build local: `npm run build`
3. Fix TypeScript errors
4. Push fix lên GitHub

### API không kết nối?
**Lỗi:** `Network Error` hoặc `CORS error`

**Giải pháp:**
1. Check `VITE_API_URL` đúng chưa
2. Verify Railway backend đang chạy
3. Check `FRONTEND_URL` trong Railway
4. Test API trực tiếp: `https://backend.railway.app/api/v1/health`

### Environment variables không work?
**Lỗi:** API calls fail, undefined variables

**Giải pháp:**
1. Vercel chỉ nhận biến bắt đầu với `VITE_`
2. Phải set TRƯỚC KHI deploy
3. Nếu add sau, phải **Redeploy**:
   - Deployments → ... → Redeploy

### Blank page sau deploy?
**Nguyên nhân:** Routing issue

**Giải pháp:**
1. Check `vercel.json` có rewrites chưa
2. Verify `dist/index.html` tồn tại
3. Check Console trong browser (F12)

## 💰 Chi phí

```
Vercel Free Tier (Hobby):
✅ FREE vĩnh viễn
✅ Unlimited projects
✅ Unlimited deployments
✅ 100GB bandwidth/tháng
✅ Serverless Functions: 100 GB-hours
✅ Global CDN
✅ Automatic HTTPS
✅ Custom domains

⚠️ Giới hạn:
- 1 người dùng
- Không có team features
- Bandwidth vượt 100GB → $20/100GB

→ Với 400 users: Hoàn toàn FREE!
```

### Nâng cấp Pro ($20/tháng) nếu cần:
- Team collaboration
- Priority support
- Advanced analytics
- Password protection
- 1TB bandwidth

## 🚀 Performance Tips

### 1. Optimize Images
```tsx
// Sử dụng WebP format
<img src="image.webp" alt="..." />

// Lazy loading
<img loading="lazy" src="..." />
```

### 2. Code Splitting
Vite đã tự động code splitting! Check `vite.config.ts`:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        router: ['react-router-dom'],
      },
    },
  },
}
```

### 3. Caching
`vercel.json` đã config cache cho assets:
- Assets (images, fonts): Cache 1 năm
- HTML: No cache (always fresh)

## 🔗 Kết nối Backend & Frontend

### Flow hoàn chỉnh:
```
User Browser
    ↓
Vercel Frontend (https://yourapp.vercel.app)
    ↓ API calls
Railway Backend (https://backend.railway.app/api/v1)
    ↓
Railway MySQL Database
```

### CORS Configuration:
Backend phải allow frontend domain:
```typescript
// backend/src/main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL, // Vercel URL
  credentials: true,
});
```

## 🔐 Security Checklist

- [ ] Environment variables không commit vào Git
- [ ] `.env` có trong `.gitignore`
- [ ] JWT secret đủ mạnh (32+ characters)
- [ ] HTTPS enabled (Vercel tự động)
- [ ] CORS chỉ allow frontend domain
- [ ] API rate limiting enabled (backend)

## 📱 Mobile Responsive

Test trên nhiều devices:
1. Vercel Preview → Mobile view
2. Chrome DevTools → Device emulation
3. Real devices (iOS, Android)

## 🎯 Next Steps

Sau khi deploy thành công:

1. **Test đầy đủ:**
   - Login/Register
   - CRUD operations
   - File uploads
   - Payment flow

2. **Monitor:**
   - Check Vercel Analytics
   - Check Railway Metrics
   - Set up error tracking (Sentry)

3. **Optimize:**
   - Lighthouse score
   - Bundle size
   - API response time

4. **Scale (khi cần):**
   - Railway: Nâng RAM/CPU
   - Vercel: Upgrade to Pro
   - Add CDN cho images (Cloudinary)

## 🔗 Links hữu ích

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Docs: https://vercel.com/docs
- Vite Docs: https://vitejs.dev
- Vercel CLI: https://vercel.com/docs/cli
