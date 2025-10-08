# MLM E-commerce Frontend

Frontend application cho hệ thống MLM E-commerce, xây dựng bằng Next.js 14 với App Router.

## 🚀 Quick Start

```bash
# 1. Cài đặt dependencies
npm install

# 2. Copy file môi trường
cp .env.local.example .env.local

# 3. Chạy development server
npm run dev
```

Mở [http://localhost:3001](http://localhost:3001) để xem trang login.

### 🔑 Đăng nhập

Sử dụng tài khoản demo (từ backend seed):
- **Email**: `admin@mlm.com`
- **Password**: `Admin@123456`

## 🏗️ Cấu trúc dự án

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/login/            ✅ Login page
│   │   ├── page.tsx                 ✅ Home redirect
│   │   ├── layout.tsx               ✅ Root layout
│   │   └── providers.tsx            ✅ Query provider
│   │
│   ├── features/                     # Feature modules
│   │   ├── auth/                    ✅ Authentication
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx   ✅ Login form
│   │   │   ├── hooks/              ✅ useLogin, useLogout
│   │   │   ├── services/           ✅ auth.service
│   │   │   └── types/              ✅ LoginDto, etc.
│   │   │
│   │   └── user/                    ✅ User management (ready)
│   │       ├── components/          🔜 Cần thêm UI
│   │       ├── hooks/              ✅ useUsers, useCreateUser
│   │       ├── services/           ✅ user.service
│   │       └── types/              ✅ User, CreateUserDto
│   │
│   ├── shared/                       # Shared resources
│   │   ├── components/
│   │   │   ├── ui/                  🔜 shadcn/ui components
│   │   │   ├── layout/             🔜 Header, Sidebar
│   │   │   └── common/             🔜 DataTable, etc.
│   │   │
│   │   ├── lib/
│   │   │   ├── api-client.ts       ✅ Axios with interceptors
│   │   │   ├── utils.ts            ✅ formatCurrency, formatDate
│   │   │   └── query-client.ts     ✅ TanStack Query config
│   │   │
│   │   ├── hooks/                   🔜 Global hooks
│   │   ├── store/                   🔜 Zustand stores
│   │   ├── types/                  ✅ Common types
│   │   └── constants/              ✅ Routes, Config, Roles
│   │
│   └── styles/
│       └── globals.css              ✅ Tailwind + CSS vars
│
└── public/                           # Static assets
```

## ✅ Features đã hoàn thành

### Authentication
- ✅ Login page với design đẹp
- ✅ Form validation (React Hook Form + Zod)
- ✅ JWT token management
- ✅ Auto redirect theo role
- ✅ Error handling
- ✅ Loading states

### User Service (Backend Integration Ready)
- ✅ TypeScript types đầy đủ
- ✅ API service methods
- ✅ React Query hooks
- ✅ Chỉ cần thêm UI components

### Shared Utilities
- ✅ API client với auto JWT
- ✅ Formatters (currency, date, phone)
- ✅ Constants (routes, roles, config)
- ✅ TanStack Query setup

## 🎨 Tech Stack

- **Next.js 14** - React framework với App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **TanStack Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Zustand** - Client state (ready)

## 📝 Scripts

```bash
npm run dev          # Development server (port 3001)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

## 🎯 Next Steps

### 1. Thêm shadcn/ui components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add table
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
```

### 2. Tạo Dashboard Layout

- Header với user menu
- Sidebar với navigation
- Main content area

### 3. User Management UI

- UserTable - Danh sách users
- UserForm - Tạo/sửa user
- UserCard - Thông tin user
- UserTree - Cây phả hệ MLM

### 4. Protected Routes

- Middleware để check authentication
- Role-based access control
- Redirect unauthorized users

## 🔧 Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_REGISTRATION=false
```

## 📖 Tài liệu

- [Next.js Docs](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Hook Form](https://react-hook-form.com/)

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port
npm run dev -- -p 3002
```

### API connection failed
- Đảm bảo backend đang chạy ở port 3000
- Kiểm tra `NEXT_PUBLIC_API_URL` trong `.env.local`
- Check CORS settings ở backend

### TypeScript errors
```bash
# Clear cache
rm -rf .next
npm run dev
```

---

**Login page đã sẵn sàng! 🎉**

Chạy `npm install && npm run dev` để bắt đầu.