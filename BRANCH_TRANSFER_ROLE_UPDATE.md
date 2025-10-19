# 🔧 Branch Transfer với Auto Role Update

## ❌ Vấn đề ban đầu:

Khi chuyển nhánh từ F2 → F4, role KHÔNG được update:
- User A (F2) con của B (F1)
- Chuyển A sang làm con của C (F4)
- **Kết quả SAI**: A vẫn là F2 ❌
- **Kết quả ĐÚNG**: A phải là F5 ✅

## ✅ Đã sửa:

### 1. Backend Repository (`user.repository.ts`)

```typescript
async transferBranch(userId: string, newSponsorId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // 🆕 Get new sponsor role
    const newSponsor = await tx.user.findUnique({
      where: { id: newSponsorId },
      select: { role: true },
    });

    // 🆕 Calculate new role: F1→F2, F2→F3, F3→F4, etc.
    const newRole = User.calculateDownlineRole(newSponsor.role as UserRole);

    // ... (cancel commissions, delete tree entries)

    // ⭐ Update user with NEW ROLE
    await tx.user.update({
      where: { id: userId },
      data: {
        sponsorId: newSponsorId,
        role: newRole, // ← CRITICAL FIX
        quotaPeriodStart: null,
        quotaUsed: 0,
      },
    });

    // ... (rebuild tree)
  });
}
```

### 2. Logic tính Role

Sử dụng `User.calculateDownlineRole()` static method:

```typescript
ADMIN → F1
F1 → F2
F2 → F3
F3 → F4
F4 → F5
F5 → F6
F6 → F6 (max level)
```

## 🧪 Test Scenarios:

### Scenario 1: F2 → F1 (Move up)
- User A (F2) con của B (F1)
- Chuyển A sang làm con của ADMIN
- **Result**: A trở thành F1 ✅

### Scenario 2: F2 → F4 (Move down)
- User A (F2) con của B (F1)
- Chuyển A sang làm con của C (F3)
- **Result**: A trở thành F4 ✅

### Scenario 3: F3 → F2 (Stay same level)
- User A (F3) con của B (F2)
- Chuyển A sang làm con của C (F1)
- **Result**: A trở thành F2 ✅

## 💰 Commission Logic - KHÔNG bị ảnh hưởng

Commission tính theo **LEVEL trong upline chain**, KHÔNG theo ROLE:
- Level 1 (sponsor trực tiếp): 10%
- Level 2 (cách 2 cấp): 4%
- Level 3 (cách 3 cấp): 2%

**Ví dụ**:
- User A (F5) mua hàng 1,000,000 VND
- Sponsor trực tiếp B (F4): 10% = 100,000 VND (level 1)
- Sponsor của B là C (F3): 4% = 40,000 VND (level 2)
- Sponsor của C là D (F2): 2% = 20,000 VND (level 3)

→ Role (F2, F3, F4, F5) KHÔNG ảnh hưởng, chỉ có vị trí trong cây (level) ảnh hưởng.

## 🎯 Kết quả:

✅ Role tự động update khi chuyển nhánh
✅ Hiển thị đúng F-level trên UI
✅ Logic commission vẫn hoạt động chính xác
✅ Ví KHÔNG bị reset (chỉ cho phép chuyển khi ví = 0)

## 📋 Test Commands:

```bash
# 1. Check current status
npx ts-node test-branch-transfer-role.ts

# 2. Reset wallet to 0 (required before transfer)
npx ts-node reset-wallet.ts dieplaif4

# 3. Add balance for testing
npx ts-node add-balance.ts dieplaif4 500000
```

## 🚀 How to Test:

1. **Reset wallet**: `npx ts-node reset-wallet.ts dieplaif4`
2. **Go to Admin Panel** → Users
3. **Find user** dieplaif4 (F3)
4. **Click "Sửa"**
5. **Select new sponsor** dieplaif1 (F1)
6. **Click "Lưu thay đổi"**
7. **Verify**: dieplaif4 role changed from F3 → F2 ✅

---

**Generated**: $(date)
**Fixed by**: Backend auto role calculation in transferBranch()
