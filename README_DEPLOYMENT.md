# 📚 Tài liệu Deploy MLM E-commerce lên cPanel

## 🎯 Chọn hướng dẫn phù hợp với bạn

### 1. **⚡ Quick Start** - Cho người muốn deploy nhanh (30 phút)
👉 **File: `QUICKSTART_DEPLOY.md`**

Dành cho:
- ✅ Người đã quen với cPanel
- ✅ Muốn deploy nhanh nhất có thể
- ✅ Follow checklist ngắn gọn

---

### 2. **📖 Full Guide** - Hướng dẫn chi tiết đầy đủ
👉 **File: `DEPLOY_CPANEL.md`**

Dành cho:
- ✅ Người deploy lần đầu
- ✅ Cần hiểu rõ từng bước
- ✅ Troubleshooting chi tiết
- ✅ Security best practices

---

## 🚀 Bắt đầu deploy

### Bước 1: Chạy script chuẩn bị

```bash
# Từ thư mục gốc project
./deploy-prepare.sh
```

Script này sẽ:
- ✅ Build backend (NestJS)
- ✅ Build frontend (React + Vite)
- ✅ Tạo file zip để upload
- ✅ Tạo .env template
- ✅ Tạo deployment checklist

**Kết quả:** Folder `deploy/` với tất cả files cần thiết

---

### Bước 2: Chọn hướng dẫn

**Option A: Deploy nhanh (khuyến nghị nếu đã có kinh nghiệm)**
```bash
# Mở và follow
cat QUICKSTART_DEPLOY.md
```

**Option B: Deploy chi tiết (khuyến nghị cho lần đầu)**
```bash
# Mở và follow
cat DEPLOY_CPANEL.md
```

---

## 📦 Files trong folder `deploy/`

Sau khi chạy `./deploy-prepare.sh`, bạn sẽ có:

```
deploy/
├── backend-deploy.zip          # Backend build files
├── frontend-deploy.zip         # Frontend build files
├── .env.production.template    # Environment variables template
└── DEPLOYMENT_CHECKLIST.md     # Checklist để tick ✅
```

---

## 🗂️ Cấu trúc Project

### Backend (NestJS + Node.js)
```
backend/
├── dist/                    # Compiled files (after build)
├── prisma/                  # Database schema & migrations
├── src/                     # Source code
├── uploads/                 # User uploaded files
├── package.json            # Dependencies
└── .env                    # Environment config (create on server)
```

**Tech Stack:**
- NestJS (Node.js framework)
- Prisma ORM
- MySQL Database
- JWT Authentication
- SePay Payment Integration

### Frontend (React + Vite)
```
frontend/
├── dist/                    # Build output (after build)
├── src/                     # Source code
├── public/                  # Static assets
└── package.json            # Dependencies
```

**Tech Stack:**
- React 18
- Vite
- TypeScript
- TailwindCSS
- React Router

---

## 🎓 Deployment Flow Tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL MACHINE                             │
│                                                              │
│  1. Run: ./deploy-prepare.sh                                │
│     ├── Build backend → dist/                               │
│     ├── Build frontend → dist/                              │
│     └── Create deploy/*.zip files                           │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Upload via FTP/SSH
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    CPANEL HOSTING                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MySQL Database                                       │   │
│  │ - Create database                                    │   │
│  │ - Create user with privileges                        │   │
│  │ - Run migrations                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Backend API (Node.js App)                           │   │
│  │ Location: /home/username/api/                       │   │
│  │ URL: https://api.yourdomain.com                     │   │
│  │                                                       │   │
│  │ 1. Extract backend-deploy.zip                       │   │
│  │ 2. Create .env file                                 │   │
│  │ 3. npm install --production                         │   │
│  │ 4. npx prisma migrate deploy                        │   │
│  │ 5. pm2 start dist/main.js                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Frontend (Static Files)                             │   │
│  │ Location: /home/username/public_html/               │   │
│  │ URL: https://yourdomain.com                         │   │
│  │                                                       │   │
│  │ 1. Extract frontend-deploy.zip                      │   │
│  │ 2. Move dist/* to public_html/                      │   │
│  │ 3. Create .htaccess for React Router                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SSL Certificate (Let's Encrypt)                     │   │
│  │ - yourdomain.com                                    │   │
│  │ - api.yourdomain.com                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Requirements Checklist

### cPanel Hosting phải có:
- [ ] **Node.js support** (version 18 trở lên)
- [ ] **MySQL database**
- [ ] **SSH access** (khuyến nghị, không bắt buộc)
- [ ] **RAM**: Tối thiểu 1GB (khuyến nghị 2GB+)
- [ ] **Disk Space**: Tối thiểu 2GB
- [ ] **SSL Certificate support** (Let's Encrypt)

### Cần chuẩn bị:
- [ ] Domain hoặc subdomain
- [ ] FTP/SSH credentials
- [ ] cPanel login
- [ ] SePay account (cho payment)
- [ ] Bank account info (cho VietQR)

---

## 🎯 URLs sau khi deploy

```
Frontend:       https://yourdomain.com
Admin Panel:    https://yourdomain.com/admin
Backend API:    https://api.yourdomain.com
API Health:     https://api.yourdomain.com/api/v1/health
API Docs:       https://api.yourdomain.com/api-docs (nếu enable)
```

---

## 🔐 Bảo mật quan trọng

Sau khi deploy, **PHẢI LÀM NGAY:**

1. ✅ **Change admin password**
   ```bash
   # SSH vào server
   cd /home/username/api
   npm run admin:create
   ```

2. ✅ **Set strong JWT_SECRET**
   ```bash
   # Generate random 32+ characters
   openssl rand -base64 32
   ```

3. ✅ **Update .env với production values**
   - Database credentials
   - JWT secret
   - Bank account info
   - API keys

4. ✅ **Enable firewall** (nếu có)

5. ✅ **Setup backup schedule** (database + files)

6. ✅ **Monitor logs regularly**
   ```bash
   pm2 logs mlm-api
   ```

---

## 🆘 Troubleshooting

### Quick Fixes

| Vấn đề | Solution |
|--------|----------|
| Backend không start | `pm2 logs mlm-api` để xem lỗi |
| Frontend blank page | Check .htaccess + clear browser cache |
| Database connection error | Verify DATABASE_URL trong .env |
| API CORS error | Update CORS_ORIGIN trong .env |
| 500 Internal Server Error | Check logs: `pm2 logs mlm-api` |
| Payment webhook not working | Verify webhook URL trong SePay dashboard |

### Chi tiết troubleshooting
👉 Xem **DEPLOY_CPANEL.md** phần "BƯỚC 9: Troubleshooting"

---

## 📊 Monitoring & Maintenance

### Check logs
```bash
# Backend logs
pm2 logs mlm-api

# Real-time monitoring
pm2 monit
```

### Restart services
```bash
# Restart backend
pm2 restart mlm-api

# Restart all PM2 apps
pm2 restart all
```

### Update code
```bash
# 1. Upload new build files
# 2. Extract to app directory
# 3. Restart
pm2 restart mlm-api
```

### Database backup
```bash
# Export database
mysqldump -u USER -p DATABASE > backup_$(date +%Y%m%d).sql

# Or via cPanel → phpMyAdmin → Export
```

---

## 📞 Support & Resources

### Documentation Files
- `QUICKSTART_DEPLOY.md` - Quick deployment guide
- `DEPLOY_CPANEL.md` - Full detailed guide
- `PAYMENT_SETUP.md` - SePay integration guide (in backend/)
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist (in deploy/)

### Logs Location
- Backend: `pm2 logs mlm-api`
- cPanel: `/home/username/logs/error_log`
- Apache: `/home/username/logs/access_log`

### Useful Commands
```bash
# PM2
pm2 status              # Check all apps
pm2 logs mlm-api        # View logs
pm2 restart mlm-api     # Restart app
pm2 stop mlm-api        # Stop app
pm2 delete mlm-api      # Remove app
pm2 save                # Save config
pm2 startup             # Auto-start on boot

# Database
mysql -u USER -p DATABASE                      # Connect to DB
npx prisma studio                              # Open Prisma Studio
npx prisma migrate deploy                      # Run migrations
npx prisma db push                             # Push schema changes

# System
df -h                   # Check disk space
free -m                 # Check memory
netstat -tulpn          # Check ports
ps aux | grep node      # Check Node processes
```

---

## 🎉 Deployment Complete!

Sau khi deploy xong:

1. ✅ Test tất cả features
2. ✅ Verify payment flow
3. ✅ Check logs không có error
4. ✅ Test trên mobile
5. ✅ Setup monitoring
6. ✅ Document any custom changes
7. ✅ Celebrate! 🎊

---

## 💡 Tips

- **Always backup** trước khi update
- **Test trên subdomain** trước khi chuyển sang domain chính
- **Monitor logs** thường xuyên trong vài ngày đầu
- **Keep dependencies updated** nhưng test kỹ trước
- **Use strong passwords** cho tất cả accounts
- **Enable 2FA** nếu có thể
- **Regular backups** - database + files

---

**Chúc bạn deploy thành công! 🚀**

Nếu gặp vấn đề, check:
1. Logs: `pm2 logs mlm-api`
2. Console browser (F12)
3. Troubleshooting section trong DEPLOY_CPANEL.md

