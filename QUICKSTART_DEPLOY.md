# ⚡ Quick Start - Deploy lên cPanel trong 30 phút

## 🎯 Tóm tắt nhanh

```
Local → Build → Upload → Configure → Deploy → Test
```

---

## 📦 Bước 1: Chuẩn bị files (5 phút)

Trên máy local:

```bash
# Chạy script tự động
chmod +x deploy-prepare.sh
./deploy-prepare.sh
```

Kết quả: Folder `deploy/` chứa:
- `backend-deploy.zip`
- `frontend-deploy.zip`  
- `.env.production.template`

---

## 🗄️ Bước 2: Setup Database (3 phút)

1. **cPanel → MySQL Databases**
2. Tạo database: `mlm_ecommerce`
3. Tạo user: `mlm_user` với password mạnh
4. Add user vào database (All Privileges)
5. **Lưu lại thông tin kết nối**

---

## 🔧 Bước 3: Deploy Backend (10 phút)

### A. Setup Node.js App
**cPanel → Setup Node.js App → Create Application**
```
Node version: 18.x
App root: /home/username/api
App URL: api.yourdomain.com
Startup file: dist/main.js
Mode: Production
```

### B. Upload files
1. **File Manager** → `/home/username/api`
2. Upload `backend-deploy.zip`
3. Extract zip
4. Xóa file zip

### C. Tạo file .env
```bash
# SSH hoặc File Manager → Create File
# File: /home/username/api/.env

DATABASE_URL="mysql://cpanel_user_mlm_user:PASSWORD@localhost:3306/cpanel_user_mlm_ecommerce"
JWT_SECRET="your-32-char-secret-key-here"
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
BANK_CODE=VCB
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_NAME=YOUR COMPANY
```

### D. Install & Start
```bash
# SSH vào server
ssh username@yourserver.com

cd /home/username/api
npm install --production
npx prisma generate
npx prisma migrate deploy

# Start với PM2
npm install -g pm2
pm2 start dist/main.js --name mlm-api
pm2 save
```

### E. Verify
```bash
curl http://localhost:3000/api/v1/health
# Should return: {"status":"ok"}
```

---

## 🎨 Bước 4: Deploy Frontend (5 phút)

### A. Upload files
1. **File Manager** → `/home/username/public_html`
2. Upload `frontend-deploy.zip`
3. Extract zip
4. **Move files từ `dist/` ra ngoài `public_html/`**

```bash
# SSH
cd /home/username/public_html
unzip frontend-deploy.zip
mv dist/* .
rm -rf dist frontend-deploy.zip
```

### B. Tạo .htaccess
**File Manager → Create File: `.htaccess`**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # HTTPS redirect
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # React Router
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 🌐 Bước 5: Setup Subdomain API (5 phút)

### A. Tạo subdomain
**cPanel → Subdomains**
```
Subdomain: api
Document Root: /home/username/api
```

### B. Tạo .htaccess cho API
**File: `/home/username/api/.htaccess`**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
</IfModule>
```

---

## 🔒 Bước 6: SSL Certificate (2 phút)

**cPanel → SSL/TLS → Let's Encrypt SSL**
- Check: `yourdomain.com`
- Check: `www.yourdomain.com`
- Check: `api.yourdomain.com`
- Click **Issue**

---

## ✅ Bước 7: Test (5 phút)

### Backend
```bash
curl https://api.yourdomain.com/api/v1/health
```

### Frontend
1. Mở: `https://yourdomain.com`
2. Test login
3. Test tạo đơn hàng

### SePay Webhook
**SePay Dashboard → Webhooks**
```
URL: https://api.yourdomain.com/api/v1/payment/sepay-webhook
```

---

## 🎉 XONG! Site đã live!

**URLs:**
- Frontend: `https://yourdomain.com`
- Backend API: `https://api.yourdomain.com`
- Admin: `https://yourdomain.com/admin`

---

## 🆘 Quick Fixes

### Backend không start
```bash
pm2 logs mlm-api
pm2 restart mlm-api
```

### Frontend blank page
- Check .htaccess
- Clear browser cache (Ctrl+Shift+R)
- Check browser console (F12)

### Database errors
```bash
# Test connection
mysql -u USER -p DATABASE

# Re-run migrations
cd /home/username/api
npx prisma migrate deploy
```

### API CORS errors
Update `.env`:
```
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```
Restart: `pm2 restart mlm-api`

---

## 📚 Chi tiết đầy đủ

Xem file: **DEPLOY_CPANEL.md** cho hướng dẫn chi tiết đầy đủ.

---

**💡 Tips:**
- Backup database trước khi migrate
- Test trên subdomain trước khi chuyển sang domain chính
- Monitor logs thường xuyên: `pm2 logs mlm-api`
- Update dependencies định kỳ
- Change admin password ngay sau deploy!

**Good luck! 🚀**

