# 🔧 Setup .env cho LaiStore.Online

## ✅ File .env đã READY!

File: **`backend-env-production.txt`**

Đã được configure với:
- ✅ Database: `v7jxw6r3e1oc_mlm_ecommerce`
- ✅ User: `v7jxw6r3e1oc_mlm_user`
- ✅ Password: `Lai712004!`
- ✅ JWT Secret: Random secure key
- ✅ Domain: `laistore.online`
- ✅ Bank BIDV: STK `6201235752` - `DIEP DUC LAI`
- ✅ SePay: Webhook mode (no API key)

---

## 📋 Bước 1: Copy nội dung file .env

```bash
# Trên máy local, xem nội dung file
cat backend-env-production.txt
```

Hoặc mở file `backend-env-production.txt` bằng text editor và copy toàn bộ.

---

## 📤 Bước 2: Tạo file .env trên server

### Option A: Dùng SSH (Khuyến nghị)

```bash
# SSH vào server
ssh v7jxw6r3e1oc@yourserver.com

# Đi tới thư mục backend
cd /home/v7jxw6r3e1oc/api

# Tạo file .env
nano .env
```

**Paste nội dung** từ `backend-env-production.txt` vào.

**Save file:**
- Nhấn `Ctrl + X`
- Nhấn `Y`
- Nhấn `Enter`

### Option B: Dùng cPanel File Manager

1. **Đăng nhập cPanel**
2. **File Manager** → Đi tới `/home/v7jxw6r3e1oc/api/`
3. Click **+ File** → Tạo file tên `.env`
4. Right-click file `.env` → **Edit**
5. **Paste** nội dung từ `backend-env-production.txt`
6. Click **Save Changes**

---

## ✔️ Bước 3: Verify file .env

```bash
# SSH vào server
cd /home/v7jxw6r3e1oc/api

# Xem nội dung file
cat .env

# Check có đúng database URL không
grep "DATABASE_URL" .env
```

Expected output:
```
DATABASE_URL="mysql://v7jxw6r3e1oc_mlm_user:Lai712004!@localhost:3306/v7jxw6r3e1oc_mlm_ecommerce"
```

---

## 🚀 Bước 4: Install dependencies và start backend

```bash
cd /home/v7jxw6r3e1oc/api

# Install packages
npm install --production

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Create admin user
npm run admin:create
```

---

## 🔥 Bước 5: Start backend với PM2

```bash
# Install PM2 globally (nếu chưa có)
npm install -g pm2

# Start backend
pm2 start dist/main.js --name laistore-api

# Save PM2 config
pm2 save

# Setup auto-start on reboot
pm2 startup

# Check status
pm2 status
pm2 logs laistore-api
```

---

## 🧪 Bước 6: Test Backend

### Test trên local server:
```bash
curl http://localhost:3000/api/v1/health
```

Expected: `{"status":"ok"}`

### Test từ bên ngoài:
```bash
curl https://api.laistore.online/api/v1/health
```

Hoặc mở browser: `https://api.laistore.online/api/v1/health`

---

## 🔗 Bước 7: Setup SePay Webhook

1. **Đăng nhập SePay Dashboard**: https://my.sepay.vn
2. Vào **Webhooks** → **Tạo webhook mới**
3. **Webhook URL**: 
   ```
   https://api.laistore.online/api/v1/payment/sepay-webhook
   ```
4. **Method**: `POST`
5. **Chọn Bank Account** đã kết nối
6. **Save**

### Test Webhook (sau khi deploy xong):

```bash
curl -X POST https://api.laistore.online/api/v1/payment/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "ORD202501231234",
    "amount": 500000,
    "gateway": "BIDV"
  }'
```

---

## 📊 Monitoring

### View logs:
```bash
# PM2 logs
pm2 logs laistore-api

# Real-time logs
pm2 logs laistore-api --lines 100 --timestamp

# Check status
pm2 status
```

### Restart backend:
```bash
pm2 restart laistore-api
```

### Stop backend:
```bash
pm2 stop laistore-api
```

---

## ⚠️ Troubleshooting

### Lỗi: Cannot connect to database
```bash
# Check database connection
mysql -u v7jxw6r3e1oc_mlm_user -p v7jxw6r3e1oc_mlm_ecommerce

# Nhập password: Lai712004!
```

### Lỗi: Port 3000 already in use
```bash
# Check process using port 3000
netstat -tulpn | grep 3000

# Kill process
kill -9 <PID>

# Restart PM2
pm2 restart laistore-api
```

### Lỗi: Prisma Client not generated
```bash
cd /home/v7jxw6r3e1oc/api
npx prisma generate
pm2 restart laistore-api
```

---

## 🎯 Quick Commands Reference

```bash
# Restart backend
pm2 restart laistore-api

# View logs
pm2 logs laistore-api

# Check status
pm2 status

# Re-deploy (after code update)
cd /home/v7jxw6r3e1oc/api
npm install --production
npx prisma migrate deploy
pm2 restart laistore-api
```

---

## 🔐 Security Checklist

- [x] Strong JWT_SECRET (random 32+ chars) ✅
- [x] Secure database password ✅
- [x] CORS configured for laistore.online ✅
- [ ] Change admin password after first login
- [ ] Setup SSL certificate (Let's Encrypt)
- [ ] Enable firewall rules
- [ ] Regular database backups

---

## 📞 Next Steps

1. ✅ Setup .env file (DONE)
2. ✅ Install dependencies
3. ✅ Run migrations
4. ✅ Start backend with PM2
5. ⏭️ Deploy frontend
6. ⏭️ Setup SSL
7. ⏭️ Configure SePay webhook
8. ⏭️ Test end-to-end

---

**🎉 Backend .env setup COMPLETE!**

Proceed to: **QUICKSTART_DEPLOY.md** - Bước 4 (Deploy Frontend)

