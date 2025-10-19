# 🌳 MLM Tree Fix - Rebuild Descendants on Branch Transfer

## ❌ Vấn đề:

Khi chuyển nhánh, **descendants không được rebuild tree**:

### Scenario:
```
Trước chuyển:
  A (F2)
  └─ B (F3)
     └─ C (F4)

A chuyển từ sponsor X → sponsor Y

Sau chuyển (SAI):
  Y
  └─ A (F2) ✅ OK

  X
  └─ B (F3) ❌ SAI! Vẫn nối vào X
     └─ C (F4) ❌ SAI! Vẫn nối vào X

Sau chuyển (ĐÚNG):
  Y
  └─ A (updated role)
     └─ B (updated nối vào A)
        └─ C (updated nối vào B)
```

## ✅ Giải pháp:

### 1. Find ALL descendants trước khi xóa tree
```typescript
const allDescendants = await tx.userTree.findMany({
  where: {
    ancestor: userId,
    descendant: { not: userId },
  },
});
const descendantIds = allDescendants.map(d => d.descendant);
```

### 2. Xóa tree của user VÀ tất cả descendants
```typescript
await tx.userTree.deleteMany({
  where: {
    OR: [
      { ancestor: userId },
      { descendant: userId },
      { ancestor: { in: descendantIds } },
      { descendant: { in: descendantIds } },
    ],
  },
});
```

### 3. Rebuild user tree (như cũ)

### 4. ⭐ REBUILD tree cho TẤT CẢ descendants (BFS)
```typescript
// Sử dụng BFS để rebuild từng cấp một
const queue = descendantsWithSponsor.filter(d => d.sponsorId === userId);

while (queue.length > 0) {
  const current = queue.shift()!;

  // Rebuild tree for current descendant
  // 1. Self-reference
  // 2. Link to sponsor's ancestors

  // Add children to queue
  const children = descendantsWithSponsor.filter(d => d.sponsorId === current.id);
  queue.push(...children);
}
```

## 🧪 Test:

### Before:
```bash
npx ts-node check-mlm-tree.ts dieplaif1

⚠️  WARNING: Found 1 orphaned user(s)
   - dieplaif2_1 (F2)
```

### Test branch transfer:
1. Reset wallet: `npx ts-node reset-wallet.ts dieplaif4`
2. Admin Panel → Users → dieplaif4 → Sửa
3. Chọn sponsor mới: dieplaif1
4. Lưu thay đổi

### After (expected):
```bash
npx ts-node check-mlm-tree.ts dieplaif1

✅ No orphaned users found
✅ All descendants properly linked
```

## 📊 Code Changes:

**File**: `backend/src/infrastructure/database/repositories/user.repository.ts`

**Lines**: 617-776

**Key changes**:
1. Line 633-641: Find all descendants before delete
2. Line 652-662: Delete tree for user + descendants
3. Line 720-774: ⭐ NEW - Rebuild tree for all descendants (BFS)

## 🎯 Impact:

✅ Khi chuyển nhánh, **toàn bộ subtree được rebuild**
✅ Descendants vẫn nối đúng vào user (không bị mất)
✅ MLM tree hiển thị đúng trên frontend
✅ Commission vẫn tính đúng (dựa trên upline chain)

## ⚠️ Important Notes:

- Chuyển nhánh là operation **EXPENSIVE** (rebuild cả subtree)
- Nếu user có nhiều descendants → Operation sẽ lâu
- Sử dụng transaction để đảm bảo atomicity
- BFS đảm bảo rebuild từ gốc xuống lá (đúng thứ tự)

---

**Fixed**: $(date)
**Algorithm**: BFS (Breadth-First Search) for tree rebuild
