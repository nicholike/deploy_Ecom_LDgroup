# 🚀 Quick Start - Frontend

## Trang Login Mới (shadcn/ui Design)

### ✨ Tính năng mới:

- **Modern Design**: Giao diện hiện đại với animations mượt mà
- **Glass Morphism**: Input fields với hiệu ứng kính mờ
- **Hero Image**: Ảnh background đẹp mắt bên phải
- **Testimonials**: Hiển thị đánh giá của users
- **Responsive**: Hoàn toàn responsive mobile-first
- **Animations**: Fade-in animations cho tất cả elements
- **Loading States**: Spinner khi đang đăng nhập
- **Error Handling**: Hiển thị lỗi đẹp mắt

## 🏃 Chạy ngay

```bash
cd frontend

# Cài dependencies (nếu chưa)
npm install

# Chạy dev server
npm run dev
```

Mở: **http://localhost:3001**

## 🎨 Component Structure

### Đã tích hợp:

✅ **SignInPage Component** (`/shared/components/ui/sign-in.tsx`)
- Props đầy đủ để customize
- Tích hợp với useLogin hook
- Loading & error states
- Animations built-in

✅ **Login Page** (`/app/(auth)/login/page.tsx`)
- Sử dụng SignInPage component
- Testimonials từ người dùng Việt Nam
- Hero image từ Unsplash
- Tích hợp hoàn chỉnh với backend API

✅ **CSS Animations** (`/styles/globals.css`)
- Fade-in animations
- Slide-right animations
- Testimonial animations
- Animation delays

## 🔑 Demo Account

```
Email: admin@mlm.com
Password: Admin@123456
```

## 📦 Dependencies đã cài:

- ✅ `lucide-react` - Icons
- ✅ `tailwindcss-animate` - Animations
- ✅ `@tanstack/react-query` - Data fetching
- ✅ `react-hook-form` + `zod` - Form handling

## 🎯 Features:

### Left Column (Form):
- Email input với validation
- Password input với show/hide
- Remember me checkbox
- Reset password link
- Sign in button với loading state
- Google sign-in option
- Create account link (shows alert)

### Right Column (Hero):
- Beautiful background image
- 3 testimonial cards
- Smooth animations
- Hidden on mobile

## 🔧 Customization

### Thay đổi Hero Image:

```tsx
// In /app/(auth)/login/page.tsx
heroImageSrc="your-image-url-here"
```

### Thay đổi Testimonials:

```tsx
const testimonials: Testimonial[] = [
  {
    avatarSrc: "url-to-avatar",
    name: "Tên người dùng",
    handle: "@username",
    text: "Nội dung đánh giá"
  },
  // ... thêm testimonials
];
```

### Thay đổi Title & Description:

```tsx
<SignInPage
  title={<span>Your Custom Title</span>}
  description="Your custom description"
  // ... other props
/>
```

## 🎨 Design Tokens:

Sử dụng Tailwind CSS với shadcn/ui design tokens:

- `--primary`: Primary color (blue)
- `--secondary`: Secondary color
- `--muted`: Muted text color
- `--border`: Border color
- `--foreground`: Text color
- `--background`: Background color

## 📱 Responsive Breakpoints:

- Mobile: < 768px (single column)
- Tablet: 768px - 1024px (hero visible)
- Desktop: 1024px+ (all testimonials visible)
- XL: 1280px+ (2 testimonials)
- 2XL: 1536px+ (3 testimonials)

## 🚀 Next Steps:

1. Đăng nhập với tài khoản demo
2. Kiểm tra auto redirect theo role
3. Tạo dashboard pages
4. Thêm user management UI

---

**Giao diện login mới đã sẵn sàng! 🎉**
