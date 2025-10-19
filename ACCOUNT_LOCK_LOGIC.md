# 🔒 Logic Khóa Tài Khoản (SUSPENDED)

## ✅ Quyết định: Dùng KHÓA thay vì XÓA

**Lý do:**
- Đơn giản, an toàn
- Không cần chuyển nhánh
- Downline vẫn hoạt động bình thường
- Có thể mở khóa lại sau

---

## 📋 Khi tài khoản bị KHÓA (status = SUSPENDED):

### 1. ❌ KHÔNG thể đăng nhập
```typescript
// auth.service.ts:87-92
if (user.status === UserStatus.SUSPENDED) {
  const reason = user.lockedReason ? ` Lý do: ${user.lockedReason}` : '';
  throw new UnauthorizedException(
    `Tài khoản của bạn đã bị tạm ngưng.${reason} Vui lòng liên hệ quản trị viên để được mở lại.`
  );
}
```

### 2. ❌ KHÔNG thể rút tiền
```typescript
// wallet.service.ts
if (user.status === 'SUSPENDED') {
  const reason = user.lockedReason ? ` Lý do: ${user.lockedReason}` : '';
  throw new BadRequestException(
    `Tài khoản của bạn đã bị tạm ngưng.${reason} Không thể rút tiền khi tài khoản bị khóa.`
  );
}
```

### 3. ✅ VẪN nhận commission
```typescript
// commission.service.ts:99
const uplineChain = await this.userRepository.findUplineChain(buyerUserId, 3);

// findUplineChain KHÔNG filter theo status
// → User SUSPENDED vẫn xuất hiện trong upline chain
// → Vẫn nhận commission
```

**Ví dụ:**
```
A (F1) - ACTIVE
└─ B (F2) - SUSPENDED ❌ (bị khóa)
   └─ C (F3) - ACTIVE
      └─ D (F4) - ACTIVE mua hàng 1,000,000 VND

Commission:
- C (sponsor trực tiếp): 10% = 100,000 VND ✅
- B (level 2): 4% = 40,000 VND ✅ VẪN NHẬN (tích lũy vào ví)
- A (level 3): 2% = 20,000 VND ✅
```

### 4. ✅ Downline vẫn hoạt động
- Các tài khoản con (downline) vẫn:
  - Đăng nhập được
  - Mua hàng được
  - Nhận commission từ downline của họ
  - MLM tree không bị ảnh hưởng

### 5. ✅ Dữ liệu được giữ nguyên
- Orders (đơn hàng)
- Commissions (hoa hồng tích lũy)
- Wallet balance (số dư ví)
- MLM tree position (vị trí trong cây)

---

## 🔧 Chức năng Admin:

### Khóa tài khoản:
```
Admin Panel → Users → Tìm user → "Khóa"
- Yêu cầu: Nhập lý do khóa
- Lưu: lockedAt (thời gian), lockedReason (lý do)
- Status: ACTIVE → SUSPENDED
```

### Mở khóa tài khoản:
```
Admin Panel → Users → Tìm user → "Mở khóa"
- Confirm: Có chắc muốn mở khóa?
- Clear: lockedAt = null, lockedReason = null
- Status: SUSPENDED → ACTIVE
```

### Bulk Actions:
- Khóa hàng loạt (với lý do chung)
- Mở khóa hàng loạt

---

## 📊 So sánh với XÓA tài khoản:

| Feature | KHÓA (SUSPENDED) | XÓA (Soft Delete) |
|---------|------------------|-------------------|
| Đăng nhập | ❌ Không được | ❌ Không được |
| Nhận commission | ✅ Vẫn nhận | ❌ Không nhận |
| Rút tiền | ❌ Không được | ❌ Không được |
| Downline | ✅ Hoạt động bình thường | ⚠️ Cần chuyển nhánh |
| MLM tree | ✅ Giữ nguyên | ❌ Bị xóa khỏi tree |
| Có thể phục hồi | ✅ Dễ (Mở khóa) | ⚠️ Phức tạp |
| Admin tracking | ✅ Giữ đầy đủ data | ✅ Giữ đầy đủ data |

---

## ✅ Ưu điểm của KHÓA:

1. **Đơn giản**: Chỉ đổi status, không cần rebuild tree
2. **An toàn**: Downline không bị ảnh hưởng
3. **Công bằng**: User vi phạm không được truy cập, nhưng downline vẫn được hưởng lợi
4. **Reversible**: Có thể mở khóa lại dễ dàng
5. **Tracking**: Giữ đầy đủ lịch sử

---

## 🎯 Use Cases:

### Case 1: User vi phạm quy định
```
Action: Khóa tài khoản
Reason: "Vi phạm điều khoản sử dụng"
Result:
- User không đăng nhập được
- Vẫn nhận commission từ downline (tích lũy)
- Không rút tiền được
- Downline vẫn hoạt động bình thường
```

### Case 2: Tài khoản spam
```
Action: Khóa tài khoản
Reason: "Spam, quảng cáo không mong muốn"
Result:
- Ngăn user spam tiếp
- Downline không bị ảnh hưởng
- Admin có thể review sau
```

### Case 3: Khóa tạm thời để điều tra
```
Action: Khóa tài khoản
Reason: "Đang điều tra giao dịch bất thường"
Result:
- User không hoạt động được
- Commission vẫn tích lũy
- Có thể mở khóa lại sau khi xác minh
```

---

## 📁 Files liên quan:

1. `auth.service.ts:87-92` - Block login
2. `wallet.service.ts:88-99` - Block withdrawal
3. `commission.service.ts:99` - Commission vẫn tính
4. `user-management.controller.ts:206-252` - Lock/Unlock endpoints
5. `UserManagement.tsx:166-233` - UI khóa/mở khóa

---

**Updated**: $(date)
**Decision**: Dùng KHÓA (SUSPENDED) thay vì XÓA
**Logic**: Vẫn nhận commission, không đăng nhập, không rút tiền
