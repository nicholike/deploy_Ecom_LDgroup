# 🚀 Hướng dẫn Deploy MLM E-commerce lên cPanel Hosting

## 📋 Tổng quan

Project này bao gồm:
- **Backend**: NestJS (Node.js) API Server
- **Frontend**: React + Vite (Static files)
- **Database**: MySQL

---

## ✅ Yêu cầu trước khi deploy

### 1. **cPanel Hosting cần có:**
- ✅ Node.js support (version 18 trở lên)
- ✅ MySQL database
- ✅ SSH access (khuyến nghị)
- ✅ Ít nhất 1GB RAM
- ✅ File Manager hoặc FTP access

### 2. **Domain/Subdomain:**
- Frontend: `example.com` hoặc `app.example.com`
- Backend API: `api.example.com`

---

## 📦 BƯỚC 1: Chuẩn bị files để upload

### A. Build Backend trên máy local

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Build production
npm run build

# 3. Generate Prisma client
npx prisma generate
```

**Kết quả:** Folder `dist/` chứa compiled code

### B. Build Frontend trên máy local

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Build production
npm run build
```

**Kết quả:** Folder `dist/` chứa static files

### C. Tạo file zip để upload

```bash
# Từ thư mục gốc project
cd /home/dieplai/Ecomerce_LDGroup

# Zip backend (không bao gồm node_modules)
cd backend
zip -r backend-deploy.zip dist/ prisma/ package.json package-lock.json .env.example uploads/ -x "node_modules/*" "*.log"

# Zip frontend
cd ../frontend
zip -r frontend-deploy.zip dist/

# Kết quả:
# - backend-deploy.zip
# - frontend-deploy.zip
```

---

## 🗄️ BƯỚC 2: Setup MySQL Database trên cPanel

### 1. **Tạo Database**

1. Đăng nhập cPanel
2. Vào **MySQL Databases**
3. Tạo database mới:
   - Database name: `mlm_ecommerce`
4. Tạo user mới:
   - Username: `mlm_user`
   - Password: `your_strong_password` (lưu lại!)
5. Add user vào database với **All Privileges**

### 2. **Lưu thông tin kết nối**

```
Host: localhost (hoặc IP server cPanel cung cấp)
Database: cpanel_username_mlm_ecommerce  (tên đầy đủ có prefix)
Username: cpanel_username_mlm_user
Password: your_strong_password
Port: 3306
```

### 3. **Import database schema**

**Option A: Sử dụng phpMyAdmin**
1. Vào **phpMyAdmin** trong cPanel
2. Chọn database vừa tạo
3. Click tab **Import**
4. Upload file SQL (nếu có) hoặc sẽ dùng Prisma migrate sau

**Option B: Sẽ dùng Prisma migrate qua SSH (khuyến nghị)**

---

## 🔧 BƯỚC 3: Deploy Backend API

### 1. **Setup Node.js Application trong cPanel**

1. Vào **Setup Node.js App** trong cPanel
2. Click **Create Application**
3. Cấu hình:
   ```
   Node.js version: 18.x hoặc 20.x
   Application mode: Production
   Application root: /home/username/api (hoặc backend)
   Application URL: api.yourdomain.com (hoặc yourdomain.com/api)
   Application startup file: dist/main.js
   ```
4. Click **Create**

### 2. **Upload Backend files**

**Option A: File Manager**
1. Vào **File Manager** trong cPanel
2. Đi tới folder application (vd: `/home/username/api`)
3. Upload `backend-deploy.zip`
4. Extract zip file
5. Xóa file zip

**Option B: FTP**
1. Dùng FileZilla hoặc FTP client
2. Upload toàn bộ folder backend vào `/home/username/api`

**Option C: SSH (Khuyến nghị)**
```bash
# Upload qua SCP
scp backend-deploy.zip username@yourserver.com:/home/username/

# SSH vào server
ssh username@yourserver.com

# Unzip
cd /home/username/api
unzip backend-deploy.zip
rm backend-deploy.zip
```

### 3. **Cấu hình Environment Variables (.env)**

SSH vào server hoặc dùng File Manager, tạo file `.env`:

```bash
cd /home/username/api
nano .env
```

Nội dung file `.env`:

```env
# Database (QUAN TRỌNG: thay thế bằng thông tin thật)
DATABASE_URL="mysql://cpanel_username_mlm_user:your_password@localhost:3306/cpanel_username_mlm_ecommerce"

# JWT Secret (tạo secret key mạnh)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-characters"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=production

# Payment - Bank Account Information
BANK_CODE=VCB
BANK_NAME=Vietcombank
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_NAME=CONG TY CUA BAN

# SePay (nếu dùng)
SEPAY_API_KEY=your_sepay_api_key
SEPAY_SECRET_KEY=your_sepay_secret_key

# CORS (thêm domain frontend)
CORS_ORIGIN=https://yourdomain.com
```

**Lưu và thoát** (Ctrl+X, Y, Enter)

### 4. **Install dependencies và Run Migrations**

```bash
cd /home/username/api

# Install dependencies (trong cPanel Node.js app hoặc qua SSH)
npm install --production

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npm run prisma:seed

# (Optional) Create admin user
npm run admin:create
```

### 5. **Start Application**

**Trong cPanel Node.js App:**
1. Click **Start App** button
2. Hoặc chạy qua SSH:
```bash
cd /home/username/api
npm run start:prod
```

### 6. **Setup PM2 (Production Process Manager) - Khuyến nghị**

```bash
# Install PM2 globally
npm install -g pm2

# Start app với PM2
cd /home/username/api
pm2 start dist/main.js --name "mlm-api"

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup

# Check status
pm2 status
pm2 logs mlm-api
```

### 7. **Verify Backend đang chạy**

```bash
# Test local
curl http://localhost:3000/api/v1/health

# Test từ bên ngoài
curl https://api.yourdomain.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

---

## 🎨 BƯỚC 4: Deploy Frontend

### 1. **Upload Frontend files**

**Option A: File Manager**
1. Vào **File Manager**
2. Đi tới `public_html/` (hoặc subdomain folder)
3. Upload `frontend-deploy.zip`
4. Extract zip
5. **Move tất cả files từ `dist/` ra `public_html/`**
   ```
   public_html/
     ├── index.html
     ├── assets/
     │   ├── index-xxx.js
     │   ├── index-xxx.css
     ├── favicon.png
     └── ...
   ```

**Option B: SSH**
```bash
cd /home/username/public_html
unzip frontend-deploy.zip
mv dist/* .
rm -rf dist
```

### 2. **Cấu hình API endpoint**

Frontend cần biết backend API URL. Check file config:

```bash
cd /home/username/public_html/assets
# Find the main JS file
grep -r "localhost:3000" .
```

**Nếu hardcoded localhost**, cần rebuild frontend với production API URL:

**Trên máy local:**
```bash
cd frontend

# Tạo file .env.production
echo "VITE_API_BASE_URL=https://api.yourdomain.com" > .env.production

# Rebuild
npm run build

# Upload lại dist/ lên server
```

### 3. **Setup .htaccess cho React Router**

Tạo file `.htaccess` trong `public_html/`:

```apache
# .htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirect HTTP to HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # Handle React Router
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
</IfModule>
```

---

## 🔒 BƯỚC 5: Setup SSL Certificate (HTTPS)

### 1. **Let's Encrypt SSL (Miễn phí)**

1. Vào **SSL/TLS** trong cPanel
2. Click **Let's Encrypt™ SSL**
3. Check domains cần SSL:
   - ✅ `yourdomain.com`
   - ✅ `www.yourdomain.com`
   - ✅ `api.yourdomain.com`
4. Click **Issue**
5. Đợi vài phút để certificate được cấp

### 2. **Verify HTTPS hoạt động**

```bash
# Test frontend
curl https://yourdomain.com

# Test backend API
curl https://api.yourdomain.com/api/v1/health
```

---

## 🌐 BƯỚC 6: Setup Domain/Subdomain

### **Backend API Subdomain**

1. Vào **Subdomains** trong cPanel
2. Tạo subdomain: `api`
3. Document Root: `/home/username/api` (hoặc folder backend)
4. Click **Create**

### **Setup Reverse Proxy cho Backend**

Tạo file `.htaccess` trong `/home/username/api`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Redirect HTTP to HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # Reverse Proxy to Node.js app
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
</IfModule>

# CORS Headers (nếu cần)
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "https://yourdomain.com"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>
```

---

## 🧪 BƯỚC 7: Testing

### 1. **Test Backend API**

```bash
# Health check
curl https://api.yourdomain.com/api/v1/health

# Login test
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### 2. **Test Frontend**

1. Mở browser: `https://yourdomain.com`
2. Test login
3. Test tạo đơn hàng
4. Test payment flow với SePay

### 3. **Test SePay Webhook**

1. Đăng nhập SePay Dashboard
2. Update webhook URL: `https://api.yourdomain.com/api/v1/payment/sepay-webhook`
3. Test gửi webhook từ SePay

---

## 📊 BƯỚC 8: Monitoring & Maintenance

### 1. **Check Logs**

```bash
# PM2 logs
pm2 logs mlm-api

# Node.js app logs (nếu không dùng PM2)
tail -f /home/username/api/backend.log

# cPanel error logs
tail -f /home/username/logs/error_log
```

### 2. **Monitor Resources**

```bash
# Check app status
pm2 status

# Check memory usage
free -m

# Check disk space
df -h
```

### 3. **Restart App khi cần**

```bash
# Restart qua PM2
pm2 restart mlm-api

# Hoặc qua cPanel Node.js App
# Click "Restart" button
```

### 4. **Update Code**

```bash
# Pull latest code (nếu dùng Git)
cd /home/username/api
git pull

# Rebuild backend
npm run build

# Restart
pm2 restart mlm-api

# Update frontend
cd /home/username/public_html
# Upload dist/ mới
```

---

## ⚠️ BƯỚC 9: Troubleshooting

### **Backend không start được**

```bash
# Check logs
pm2 logs mlm-api --lines 100

# Check port đã được dùng chưa
netstat -tulpn | grep 3000

# Check database connection
npx prisma db push
```

### **Frontend không load được**

1. Check .htaccess file
2. Check file permissions: `chmod 644` cho files, `chmod 755` cho folders
3. Clear browser cache
4. Check console errors (F12)

### **API CORS errors**

Update file `.env`:
```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

Restart backend.

### **Database connection errors**

1. Verify DATABASE_URL trong `.env`
2. Check user có đủ quyền không
3. Test connection:
```bash
mysql -u cpanel_username_mlm_user -p -h localhost cpanel_username_mlm_ecommerce
```

---

## 🔐 BƯỚC 10: Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS (SSL)
- [ ] Setup firewall rules
- [ ] Restrict database access
- [ ] Enable rate limiting
- [ ] Regular backups
- [ ] Update dependencies regularly
- [ ] Monitor logs for suspicious activity
- [ ] Disable directory listing
- [ ] Remove .env.example from production

---

## 📞 Support

- Backend logs: `/home/username/api/backend.log`
- PM2 logs: `pm2 logs mlm-api`
- cPanel error logs: `/home/username/logs/error_log`

---

## 🎯 Quick Commands Reference

```bash
# Restart backend
pm2 restart mlm-api

# View logs
pm2 logs mlm-api

# Check status
pm2 status

# Stop app
pm2 stop mlm-api

# Database migrations
cd /home/username/api
npx prisma migrate deploy

# Prisma Studio (view data)
npx prisma studio
```

---

**🎉 Deployment Complete!**

Frontend: `https://yourdomain.com`  
Backend API: `https://api.yourdomain.com`  
Admin Panel: `https://yourdomain.com/admin`

Hãy test kỹ tất cả features trước khi public! 🚀

