# 🔧 Test Branch Transfer Logic

## ✅ Đã sửa:

### 1. Backend Controller (`user-management.controller.ts`)
- **Thêm validation**: Kiểm tra ví phải = 0 trước khi cho phép chuyển nhánh
- **Error message**: Hiển thị số dư hiện tại nếu ví > 0
- **Updated response**: Không còn message "reset wallet to 0"

### 2. Repository (`user.repository.ts`)
- **Removed**: Phần code tự động reset ví về 0
- **Updated comment**: Rõ ràng rằng wallet không được reset
- **Validation**: Controller sẽ check wallet = 0 trước khi gọi transferBranch()

### 3. Frontend (`UserManagement.tsx`)
- **Warning message**: "⚠️ YÊU CẦU: Ví phải = 0 mới được chuyển nhánh"
- **Updated list**: Không còn item "Đặt lại số dư ví về 0"
- **Added note**: "Ví sẽ KHÔNG bị reset" (in đậm)

---

## 🧪 Test Cases:

### Case 1: Chuyển nhánh khi ví = 0 ✅
```bash
# User có ví = 0
# Expected: Chuyển nhánh thành công
# Actions:
# - Cancel commissions
# - Reset quota
# - Rebuild tree
# - Wallet giữ nguyên = 0
```

### Case 2: Chuyển nhánh khi ví > 0 ❌
```bash
# User có ví = 500,000 VND
# Expected: Error 400
# Message: "Cannot transfer branch. User wallet balance must be 0. Current balance: 500,000 VND"
```

---

## 📊 Flow mới:

```
Admin clicks "Chuyển nhánh"
    ↓
Frontend shows warning:
"⚠️ ĐIỀU KIỆN: Ví tài khoản phải bằng 0 mới được chuyển nhánh"
    ↓
Admin confirms
    ↓
Backend checks wallet balance
    ↓
If wallet > 0 → Return error 400 ❌
If wallet = 0 → Transfer branch ✅
    ↓
Transfer actions:
- Cancel all commissions
- Reset quota to 0
- Rebuild user tree
- Wallet KHÔNG bị đụng đến
```

---

## 🛠️ Admin workflow để chuyển nhánh:

1. **Kiểm tra ví user** (ở trang Wallet hoặc User Details)
2. **Nếu ví > 0**: Admin phải xử lý tiền trước (withdraw, transfer, etc.)
3. **Khi ví = 0**: Mới được phép chuyển nhánh
4. **Chuyển nhánh**: Commissions bị cancel, quota reset, nhưng wallet giữ nguyên = 0

---

## 📝 Notes:

- Wallet balance phải = 0 TRƯỚC KHI chuyển nhánh
- Hệ thống KHÔNG tự động reset wallet
- Admin phải tự xử lý tiền trong ví trước
- Đảm bảo không mất tiền của user
