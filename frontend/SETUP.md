# Frontend Setup Guide

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
cd frontend
npm install
# hoặc
pnpm install
```

### 2. Cấu hình môi trường

File `.env.local` đã được tạo với cấu hình mặc định:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_REGISTRATION=false
```

### 3. Chạy development server

```bash
npm run dev
# hoặc
pnpm dev
```

Frontend sẽ chạy tại: **http://localhost:3001**

### 4. Đăng nhập

Mở trình duyệt và truy cập: **http://localhost:3001**

Sử dụng tài khoản demo (đã được seed từ backend):
- **Email**: `admin@mlm.com`
- **Password**: `Admin@123456`

## ✨ Tính năng đã hoàn thành

### ✅ Login Page
- Design đẹp mắt dựa trên template được cung cấp
- Form validation với React Hook Form + Zod
- Tích hợp với backend API
- Loading states & error handling
- Responsive design
- Show/hide password
- Remember me checkbox
- Demo account info

### ✅ Authentication
- Login/Logout
- JWT token management
- Auto redirect based on role
- Protected routes (ready)

### ✅ User Service (Ready for UI)
- Complete TypeScript types
- API service methods
- React Query hooks
- Ready for components

## 📁 Cấu trúc pages

```
src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx         ✅ Login page
│   └── layout.tsx           ✅ Auth layout
├── page.tsx                 ✅ Home (redirect to login)
├── layout.tsx               ✅ Root layout
├── providers.tsx            ✅ Query client provider
├── loading.tsx              ✅ Global loading
├── error.tsx                ✅ Global error
└── not-found.tsx            ✅ 404 page
```

## 🎨 Design Features

### Login Page
- Gradient background
- Clean white form container
- Beautiful gradient overlay panel (red/pink)
- Form validation với error messages
- Loading spinner khi đang đăng nhập
- Demo account info box
- Responsive mobile-first design

### Colors
- Primary: `#FF4B2B` → `#FF416C` (gradient)
- Background: Gray 50 → Gray 100
- White forms với subtle shadows

## 🔧 Next Steps

1. **Dashboard Pages** - Tạo dashboard cho Admin/Manager
2. **User Management UI** - UserTable, UserForm, UserCard
3. **Protected Routes** - Middleware để check auth
4. **Distributor Portal** - Dashboard cho distributor
5. **Customer Portal** - Dashboard cho customer

## 📝 Notes

- Backend phải chạy ở port 3000
- Frontend chạy ở port 3001
- CORS đã được cấu hình ở backend
- JWT token tự động được thêm vào headers

---

**Trang login đã sẵn sàng! Chạy `npm run dev` để xem.**
