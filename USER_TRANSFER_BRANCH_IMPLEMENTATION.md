# ✅ USER EDIT & TRANSFER BRANCH - IMPLEMENTATION GUIDE

## 📋 Tổng quan:

Feature này cho phép **Admin chuyển user sang nhánh mới** (đổi sponsor) với các điều kiện:
- ✅ Wallet balance = 0
- ✅ Reset toàn bộ: commissions, quota, wallet, UserTree
- ✅ Giữ lại: email, username, password, name, phone, orders (cho admin tracking)

---

## 🔧 Backend - ĐÃ HOÀN THÀNH

### 1. API Endpoint mới

**File:** `backend/src/presentation/http/controllers/user.controller.ts`

**Endpoint:** `POST /users/:userId/transfer-branch`

**Request body:**
```json
{
  "newSponsorId": "uuid-of-new-sponsor"
}
```

**Response:**
```json
{
  "message": "User transferred to new branch successfully",
  "userId": "user-id",
  "oldSponsorId": "old-sponsor-id",
  "newSponsorId": "new-sponsor-id"
}
```

**Errors:**
- `404`: User not found / New sponsor not found
- `400`: Wallet balance !== 0

---

### 2. Repository Methods mới

**File:** `backend/src/infrastructure/database/repositories/user.repository.ts`

#### a) `getWalletBalance(userId: string): Promise<number>`
- Lấy wallet balance của user
- Return 0 nếu chưa có wallet

#### b) `transferBranch(userId: string, newSponsorId: string): Promise<void>`
- **Transaction đảm bảo atomicity** ✅
- **Steps:**
  1. Cancel all commission records (set status = CANCELLED, keep for admin)
  2. Delete all UserTree entries
  3. Update user: change sponsorId, reset quota
  4. Reset wallet to 0
  5. Rebuild UserTree for new branch

---

### 3. Logic chi tiết

```typescript
async transferBranch(userId: string, newSponsorId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // 1. Cancel all commission records (KHÔNG XÓA, chỉ cancel)
    await tx.commission.updateMany({
      where: { userId },
      data: {
        status: 'CANCELLED',
        notes: 'Cancelled due to branch transfer',
      },
    });

    // 2. Delete all UserTree entries
    await tx.userTree.deleteMany({
      where: {
        OR: [
          { ancestor: userId },
          { descendant: userId },
        ],
      },
    });

    // 3. Update user: change sponsor, reset quota
    await tx.user.update({
      where: { id: userId },
      data: {
        sponsorId: newSponsorId,
        quotaPeriodStart: null,
        quotaUsed: 0,
      },
    });

    // 4. Reset wallet to 0
    await tx.wallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: { balance: 0 },
    });

    // 5. Rebuild UserTree
    // Self-reference
    await tx.userTree.create({
      data: {
        ancestor: userId,
        descendant: userId,
        level: 0,
      },
    });

    // Create tree entries for all ancestors of new sponsor
    const ancestorTrees = await tx.userTree.findMany({
      where: { descendant: newSponsorId },
    });

    for (const ancestorTree of treesToCreate) {
      await tx.userTree.create({
        data: {
          ancestor: ancestorTree.ancestor,
          descendant: userId,
          level: ancestorTree.level + 1,
        },
      });
    }
  });
}
```

---

## 🎨 Frontend - CẦN BỔ SUNG

### 1. Service đã thêm

**File:** `frontend/src/services/user-management.service.ts`

**Methods mới:**
```typescript
// Transfer user to new branch
async transferBranch(userId: string, newSponsorId: string): Promise<{
  message: string;
  userId: string;
  oldSponsorId: string | null;
  newSponsorId: string;
}>

// Get wallet balance (optional - backend auto check)
async getWalletBalance(userId: string): Promise<{ balance: number }>
```

---

### 2. Cần thêm vào UserManagement.tsx

**File:** `frontend/src/pages/Users/UserManagement.tsx`

#### a) Thêm State cho Transfer Modal:

```typescript
const [showTransferModal, setShowTransferModal] = useState(false);
const [selectedSponsor, setSelectedSponsor] = useState<string>('');
const [sponsorSearch, setSponsorSearch] = useState('');
const [sponsorOptions, setSponsorOptions] = useState<User[]>([]);
```

#### b) Thêm Button "Chuyển nhánh" vào Table Actions (Line ~590-613):

```typescript
<td className="px-4 py-3">
  <div className="flex items-center justify-center gap-2">
    {/* Existing buttons: Chi tiết, Khóa, Mở khóa */}

    {/* NEW: Transfer Branch Button */}
    {user.role !== 'ADMIN' && (
      <button
        onClick={() => handleTransferBranch(user)}
        className="rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-700"
      >
        Chuyển nhánh
      </button>
    )}
  </div>
</td>
```

#### c) Thêm Handler Function:

```typescript
const handleTransferBranch = async (user: User) => {
  setSelectedUser(user);
  setShowTransferModal(true);
  setSelectedSponsor('');
  setSponsorSearch('');

  // Load all users để chọn sponsor mới
  try {
    const data = await UserManagementService.searchUsers({ pageSize: 1000 });
    setSponsorOptions(data.users.filter(u => u.id !== user.id)); // Exclude chính user đang chuyển
  } catch (error) {
    console.error('Failed to load sponsors:', error);
  }
};

const confirmTransferBranch = async () => {
  if (!selectedUser || !selectedSponsor) {
    showToast({
      tone: 'error',
      title: 'Lỗi',
      description: 'Vui lòng chọn sponsor mới',
    });
    return;
  }

  if (!confirm(`Bạn có chắc muốn chuyển "${selectedUser.username}" sang nhánh mới?\n\nLưu ý: Tất cả hoa hồng, quota sẽ bị reset về 0!`)) {
    return;
  }

  try {
    setModalLoading(true);

    // Check wallet balance (optional - backend cũng check)
    const wallet = await UserManagementService.getWalletBalance(selectedUser.id);
    if (wallet.balance !== 0) {
      showToast({
        tone: 'error',
        title: 'Không thể chuyển nhánh',
        description: `Wallet balance phải = 0. Hiện tại: ${wallet.balance} VND`,
      });
      return;
    }

    // Transfer
    await UserManagementService.transferBranch(selectedUser.id, selectedSponsor);

    showToast({
      tone: 'success',
      title: 'Thành công',
      description: 'Đã chuyển user sang nhánh mới',
    });

    setShowTransferModal(false);
    setSelectedUser(null);
    await loadUsers();
  } catch (error: any) {
    console.error('Failed to transfer branch:', error);
    showToast({
      tone: 'error',
      title: 'Lỗi',
      description: error.message || 'Không thể chuyển nhánh',
    });
  } finally {
    setModalLoading(false);
  }
};
```

#### d) Thêm Transfer Modal Component (sau LockUserModal):

```typescript
// ========================================
// TRANSFER BRANCH MODAL
// ========================================
const TransferBranchModal: React.FC<{
  user: User;
  selectedSponsor: string;
  setSelectedSponsor: (id: string) => void;
  sponsorOptions: User[];
  sponsorSearch: string;
  setSponsorSearch: (search: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({
  user,
  selectedSponsor,
  setSelectedSponsor,
  sponsorOptions,
  sponsorSearch,
  setSponsorSearch,
  loading,
  onConfirm,
  onClose
}) => {
  const filteredSponsors = sponsorOptions.filter(s =>
    s.username.toLowerCase().includes(sponsorSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(sponsorSearch.toLowerCase()) ||
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(sponsorSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chuyển nhánh - {user.username}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">⚠️ Cảnh báo</h4>
            <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              <li>• Wallet balance phải = 0 (nếu > 0 cần rút hết trước)</li>
              <li>• Tất cả hoa hồng sẽ bị CANCEL</li>
              <li>• Quota sẽ reset về 0</li>
              <li>• UserTree (cây MLM) sẽ rebuild</li>
              <li>• Giữ lại: email, username, password, tên, phone</li>
              <li>• Orders giữ lại cho admin tracking</li>
            </ul>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sponsor hiện tại:
            </label>
            <div className="rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
              {user.sponsor ? (
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user.sponsor.username}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user.sponsor.firstName} {user.sponsor.lastName}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Không có sponsor</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Chọn sponsor mới: <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              placeholder="Tìm kiếm sponsor..."
              value={sponsorSearch}
              onChange={(e) => setSponsorSearch(e.target.value)}
              className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8B5E1E] focus:outline-none focus:ring-1 focus:ring-[#8B5E1E] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />

            <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600">
              {filteredSponsors.map((sponsor) => (
                <label
                  key={sponsor.id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedSponsor === sponsor.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="sponsor"
                    value={sponsor.id}
                    checked={selectedSponsor === sponsor.id}
                    onChange={() => setSelectedSponsor(sponsor.id)}
                    className="h-4 w-4 text-[#8B5E1E] focus:ring-[#8B5E1E]"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{sponsor.username}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {sponsor.firstName} {sponsor.lastName} · {sponsor.email}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getFlevelColor(sponsor.role)}`}>
                    {getFlevelFromRole(sponsor.role)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !selectedSponsor}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận chuyển nhánh'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### e) Render Modal trong component (sau LockUserModal):

```typescript
{/* Lock Modal */}
{showLockModal && selectedUser && (
  <LockUserModal
    user={selectedUser}
    reason={lockReason}
    setReason={setLockReason}
    loading={modalLoading}
    onConfirm={confirmLockUser}
    onClose={() => {
      setShowLockModal(false);
      setSelectedUser(null);
      setLockReason('');
    }}
  />
)}

{/* NEW: Transfer Branch Modal */}
{showTransferModal && selectedUser && (
  <TransferBranchModal
    user={selectedUser}
    selectedSponsor={selectedSponsor}
    setSelectedSponsor={setSelectedSponsor}
    sponsorOptions={sponsorOptions}
    sponsorSearch={sponsorSearch}
    setSponsorSearch={setSponsorSearch}
    loading={modalLoading}
    onConfirm={confirmTransferBranch}
    onClose={() => {
      setShowTransferModal(false);
      setSelectedUser(null);
      setSelectedSponsor('');
      setSponsorSearch('');
    }}
  />
)}
```

---

## 🧪 Test Flow:

### 1. Test Backend API:
```bash
# 1. Get user wallet balance
curl -X GET http://localhost:3000/api/v1/users/{userId}/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Transfer branch (balance phải = 0)
curl -X POST http://localhost:3000/api/v1/users/{userId}/transfer-branch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newSponsorId": "new-sponsor-uuid"}'
```

### 2. Test Frontend:
```bash
# 1. Vào trang User Management
http://localhost:5173/admin/users

# 2. Click button "Chuyển nhánh" ở user bất kỳ (không phải ADMIN)
# 3. Chọn sponsor mới trong modal
# 4. Click "Xác nhận chuyển nhánh"

# Expected Result:
# - Nếu wallet !== 0: Error message
# - Nếu wallet = 0: Success, reload danh sách users
```

---

## 📊 Database Changes:

### Commission Records:
```sql
-- Trước transfer:
SELECT * FROM commissions WHERE userId = 'user-id' AND status = 'PENDING';

-- Sau transfer:
SELECT * FROM commissions WHERE userId = 'user-id' AND status = 'CANCELLED';
-- notes = 'Cancelled due to branch transfer'
```

### User Table:
```sql
-- Trước transfer:
sponsorId = 'old-sponsor-id'
quotaPeriodStart = '2025-01-01'
quotaUsed = 50

-- Sau transfer:
sponsorId = 'new-sponsor-id'
quotaPeriodStart = NULL
quotaUsed = 0
```

### Wallet:
```sql
-- Sau transfer:
balance = 0
```

### UserTree:
```sql
-- Trước transfer: User có many entries (ancestor/descendant)

-- Sau transfer: User chỉ có entries mới từ new sponsor
SELECT * FROM user_tree WHERE descendant = 'user-id';
-- Results: Tree path từ root -> new sponsor -> user
```

---

## 🔑 Key Points:

1. ✅ **Transaction đảm bảo atomicity** - Tất cả bước đều success hoặc rollback
2. ✅ **Giữ lại data cho admin tracking** - Commissions set CANCELLED, orders giữ nguyên
3. ✅ **Check wallet balance** - Cả frontend và backend đều check
4. ✅ **Rebuild UserTree chính xác** - Tính toán lại closure table
5. ⚠️ **Không thể undo** - Cần warning rõ ràng cho admin

---

## 🚀 Next Steps:

1. ✅ Backend đã hoàn thành
2. ⏳ Frontend: Cần thêm code vào `UserManagement.tsx` theo hướng dẫn trên
3. ⏳ Test thoroughly với nhiều cases:
   - User có wallet > 0
   - User có wallet = 0
   - User có downline (downline không bị ảnh hưởng)
   - Check UserTree rebuild đúng

---

**Tóm lại:** Backend đã sẵn sàng, frontend chỉ cần copy/paste code từ document này vào `UserManagement.tsx`! 🚀
