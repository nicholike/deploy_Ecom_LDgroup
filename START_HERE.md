# 🚀 START HERE - MLM E-commerce Project

## ⚡ Setup Siêu Nhanh (1 Lệnh)

Mở terminal và chạy:

```bash
cd /home/dieplai/Ecomerce_LDGroup
./run-setup.sh
```

Script sẽ tự động:
1. ✅ Tạo MySQL database và user
2. ✅ Setup backend (install, migrate, seed)
3. ✅ Verify tất cả mọi thứ
4. ✅ Hiển thị credentials

**Sau đó:**

```bash
# Terminal 1: Start backend
cd /home/dieplai/Ecomerce_LDGroup/backend
pnpm run start:dev

# Terminal 2: Open frontend test
xdg-open /home/dieplai/Ecomerce_LDGroup/frontend-test/index.html
```

---

## 📁 Cấu Trúc Project

```
Ecomerce_LDGroup/
├── 📄 START_HERE.md          ← BẠN ĐANG Ở ĐÂY
├── 📄 SETUP_COMPLETE.md      ← Hướng dẫn chi tiết từng bước
├── 📄 claude.md              ← Tài liệu dự án đầy đủ (2387 dòng)
├── 📄 PROJECT_STATUS.md      ← Trạng thái & roadmap
├── 📄 QUICKSTART.md          ← Quick reference
├── 🔧 run-setup.sh           ← Script setup tự động
│
├── backend/                  ← NestJS Backend
│   ├── src/                  ← Source code (Clean Architecture)
│   ├── prisma/               ← Database schema & migrations
│   ├── .env                  ← Config (đã setup sẵn)
│   ├── README.md             ← Backend docs
│   ├── SETUP.md              ← Setup guide
│   └── MYSQL_SETUP_ARCH.md   ← MySQL setup cho Arch Linux
│
└── frontend-test/            ← Frontend Test UI
    ├── index.html            ← Main UI
    ├── css/style.css         ← Styles
    ├── js/api.js             ← API functions
    ├── js/app.js             ← UI logic
    └── README.md             ← Frontend docs
```

---

## 🎯 Sau Khi Setup Xong

### 1. Backend API
- **URL**: http://localhost:3000
- **Docs**: http://localhost:3000/api/docs
- **Status**: Check "● Online" badge trong frontend

### 2. Frontend Test
- **File**: `frontend-test/index.html`
- **Features**: Login, Create User, List Users, Update User
- **Auto-save**: Token tự động lưu trong localStorage

### 3. Database
- **GUI**: `pnpm prisma:studio` (http://localhost:5555)
- **CLI**: `mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce`
- **Tables**: 9 tables (users, products, orders, commissions, etc.)

---

## 🔑 Credentials

### Database
```
Host: localhost:3306
Database: mlm_ecommerce
User: mlm_user
Password: mlm_password_2025
```

### Admin Account
```
Email: admin@mlm.com
Password: Admin@123456
Role: ADMIN
```

---

## ✅ Test Flow

1. **Start Backend**
   ```bash
   cd backend && pnpm run start:dev
   ```

2. **Open Frontend Test**
   ```bash
   xdg-open frontend-test/index.html
   ```

3. **Login**
   - Email: `admin@mlm.com`
   - Password: `Admin@123456`
   - Click "Login"

4. **Get Current User**
   - Click "Get Me"
   - Xem thông tin admin
   - Sponsor ID tự động điền

5. **Create Manager**
   - Email: `manager@mlm.com`
   - Username: `manager01`
   - Password: `Manager@123`
   - Role: MANAGER
   - Click "Create User"

6. **List Users**
   - Click "Get Users"
   - Xem list với pagination

7. **Update User**
   - Copy user ID từ list
   - Điền vào form Update
   - Thay đổi thông tin
   - Click "Update User"

---

## 📚 Documentation

| File | Mục Đích |
|------|----------|
| `claude.md` | Tài liệu dự án đầy đủ, architecture, API docs |
| `PROJECT_STATUS.md` | Trạng thái project, modules đã làm |
| `SETUP_COMPLETE.md` | Hướng dẫn setup chi tiết từng bước |
| `QUICKSTART.md` | Quick reference commands |
| `backend/README.md` | Backend documentation |
| `frontend-test/README.md` | Frontend test guide |

---

## 🛠️ Useful Commands

### Backend
```bash
# Start dev server
pnpm run start:dev

# Build production
pnpm run build

# Run tests
pnpm run test

# Prisma Studio (DB GUI)
pnpm prisma:studio

# Generate Prisma Client
pnpm prisma:generate

# Create migration
pnpm prisma:migrate

# Seed database
pnpm prisma:seed

# Reset database (⚠️ Xóa data!)
pnpm prisma migrate reset
```

### Database
```bash
# Login MySQL
mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce

# Show tables
mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce -e "SHOW TABLES;"

# Backup
mysqldump -u mlm_user -pmlm_password_2025 mlm_ecommerce > backup.sql

# Restore
mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce < backup.sql

# Check MariaDB status
systemctl status mariadb
```

---

## 🎯 Next Steps

### Phase 2: Product Module
Implement:
- ✅ Product CRUD
- ✅ Category management
- ✅ Image upload
- ✅ Stock management

### Phase 3: Order Module
Implement:
- ✅ Create order
- ✅ Order tracking
- ✅ Status management
- ✅ Invoice generation

### Phase 4: Commission Module (CORE)
Implement:
- ✅ MLM tree traversal
- ✅ Commission calculation
- ✅ Batch processing
- ✅ Approval workflow

Xem `claude.md` để biết chi tiết từng module!

---

## ❓ Troubleshooting

### Backend không start?
```bash
# Check dependencies
pnpm install

# Check .env
cat backend/.env

# Check database
mysql -u mlm_user -pmlm_password_2025 -e "SHOW DATABASES;"
```

### Database error?
```bash
# Check MariaDB running
systemctl status mariadb

# Start MariaDB
sudo systemctl start mariadb

# Reset migrations
cd backend && pnpm prisma migrate reset
```

### CORS error trong frontend?
- Check backend đang chạy: http://localhost:3000
- Check CORS_ORIGIN trong `backend/.env`

### Token invalid?
- Click "Logout" và "Login" lại
- Clear localStorage: F12 → Application → Local Storage → Clear

---

## 🎨 Frontend Test Features

- ✅ **Beautiful UI** - Modern gradient design
- ✅ **Real-time Logs** - Xem mọi request/response
- ✅ **Auto Token** - Tự động lưu và sử dụng JWT
- ✅ **API Status** - Hiển thị backend online/offline
- ✅ **Form Validation** - Validate trước khi gửi
- ✅ **Error Handling** - Hiển thị lỗi rõ ràng
- ✅ **Responsive** - Hoạt động trên mọi screen size

---

## 📞 Quick Links

- **Swagger UI**: http://localhost:3000/api/docs
- **Prisma Studio**: http://localhost:5555 (sau khi chạy `pnpm prisma:studio`)
- **Frontend Test**: `file:///home/dieplai/Ecomerce_LDGroup/frontend-test/index.html`

---

## 🎉 Ready to Code!

Bạn đã có:
- ✅ Backend API với Clean Architecture
- ✅ Database với 9 tables
- ✅ Frontend test UI
- ✅ Admin account
- ✅ Full documentation

**Let's build something amazing! 🚀**

