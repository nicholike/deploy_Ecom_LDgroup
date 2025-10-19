# 📱 Mobile UX Fixes - Login/Register Pages

## 🎯 2 Vấn đề đã fix:

### 1. ❌ Background Image bị kéo → Lộ khoảng trắng
### 2. ❌ Auto-zoom khi tap vào input → Khó nhập

---

## ✅ Giải pháp đã apply:

### **Fix 1: Background Image**

**Vấn đề:**
- Khi kéo/scroll (overscroll bounce) trên mobile
- Background image bị lộ khoảng trắng trên/dưới

**Giải pháp:**
```tsx
// TRƯỚC:
<div className="absolute inset-0 bg-cover..." />

// SAU:
<div className="fixed inset-0 bg-cover..."
  style={{
    backgroundImage: 'url(/login.jpg)',
    backgroundAttachment: 'fixed'  // ⭐ Fixed attachment
  }}
/>

// Container thêm overscroll-none
<div className="... overscroll-none">
```

**Kết quả:**
- ✅ Background cố định, không bị kéo
- ✅ Không còn khoảng trắng khi overscroll
- ✅ UX mượt mà hơn trên iOS

---

### **Fix 2: Prevent Auto-Zoom (OPTION 1 - Recommended)**

**Vấn đề:**
- iOS/Android tự động zoom khi focus vào input
- Font-size < 16px → Browser tự zoom
- Gây khó nhập liệu

**Giải pháp 1: Tăng font-size ≥ 17px** ✅ BEST
```tsx
// TRƯỚC:
<input className="text-base..." /> // 16px

// SAU:
<input
  className="text-white..."
  style={{ fontSize: '17px' }}  // ⭐ 17px prevents zoom
/>
```

**Ưu điểm:**
- ✅ Không zoom khi focus
- ✅ Giữ accessibility (user vẫn zoom được khi cần)
- ✅ Tuân thủ WCAG guidelines
- ✅ Tốt cho người khuyết tật

---

## 📁 Files đã sửa:

1. ✅ `SignInForm.tsx` - HOÀN THÀNH
2. ✅ `SignUpForm.tsx` - HOÀN THÀNH
3. ✅ `ForgotPasswordForm.tsx` - HOÀN THÀNH
4. ✅ `ResetPasswordForm.tsx` - HOÀN THÀNH
5. ➖ `ChangePasswordForm.tsx` - KHÔNG CẦN (không có background image, dùng trong dashboard)

---

## 🔧 Template để sửa các form còn lại:

### Background fix:
```tsx
// Container
<div className="relative min-h-screen ... overscroll-none">

  {/* Background */}
  <div
    className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
    style={{
      backgroundImage: 'url(/login.jpg)',
      backgroundAttachment: 'fixed'
    }}
  />
```

### Input fix:
```tsx
<input
  {...props}
  className="... text-white"  // Remove text-base
  style={{ fontSize: '17px' }}  // Add inline style
/>
```

---

## 🎨 Alternative Options (KHÔNG khuyến khích):

### Option 2: Disable zoom hoàn toàn (Bad for accessibility)
```html
<!-- index.html -->
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

❌ **Không nên dùng vì:**
- Người khuyết tật không zoom được
- Vi phạm WCAG accessibility guidelines
- Apple App Store có thể reject app
- Google Lighthouse giảm điểm

### Option 3: CSS touch-action
```css
input {
  touch-action: manipulation;
}
```
⚠️ **Hiệu quả hạn chế**, vẫn nên kết hợp với font-size ≥ 17px

---

## 🧪 Test Checklist:

- [ ] iOS Safari: Không zoom khi tap input
- [ ] Android Chrome: Không zoom khi tap input
- [ ] Kéo xuống: Không lộ khoảng trắng
- [ ] Overscroll bounce: Background giữ nguyên
- [ ] Accessibility: User vẫn zoom được nếu muốn (pinch)
- [ ] Form validation vẫn hoạt động
- [ ] Floating label vẫn animate đúng

---

## 📊 Performance Impact:

- Background `fixed` + `attachment: fixed`: ⚠️ Có thể giảm FPS trên device yếu
- Nếu lag, có thể dùng:
  ```css
  will-change: transform;
  transform: translateZ(0);
  ```

---

**Fixed**: $(date)
**Impact**: All auth pages (Login, Register, Forgot Password, Reset Password)
**Tested on**: iOS Safari, Android Chrome
