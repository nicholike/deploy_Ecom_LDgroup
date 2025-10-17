# 🧪 Testing Guide - MLM E-Commerce Backend

## 📋 Overview

Hệ thống testing này giúp bạn kiểm tra toàn bộ luồng nghiệp vụ quan trọng của hệ thống MLM E-commerce một cách tự động.

## 🔧 Prerequisites

1. **Backend đang chạy**:
   ```bash
   npm run start:dev
   ```

2. **Database đã được migrate**:
   ```bash
   npx prisma db push
   ```

3. **Admin account tồn tại** (default: `admin@laistore.online` / `Admin@123`)

## 🚀 Test Scripts

### 1. **Flow Test Suite** (`test-flow.sh`)

**Mục đích**: Kiểm tra toàn bộ luồng đăng ký → duyệt → login tự động

**Tests bao gồm**:
- ✅ Admin login
- ✅ Public user registration với referral code
- ✅ PENDING user KHÔNG thể login (bug fix verified)
- ✅ Admin lấy danh sách pending users
- ✅ Admin approve user
- ✅ Approved user CÓ THỂ login
- ✅ UserTree được tạo sau khi approve (bug fix verified)
- ✅ Không thể đăng ký với sponsor không ACTIVE (bug fix verified)
- ✅ Re-registration cho REJECTED users

**Cách chạy**:
```bash
# Default (localhost:3000)
./test-flow.sh

# Custom API URL
API_URL=http://api.laistore.online/api/v1 ./test-flow.sh

# Custom admin credentials
ADMIN_EMAIL=admin@custom.com ADMIN_PASSWORD=CustomPass123 ./test-flow.sh
```

**Output mẫu**:
```
======================================
  MLM E-COMMERCE TEST SUITE
======================================

[INFO] Test 1: Admin login...
[SUCCESS] Admin logged in successfully
[INFO] Access Token: eyJhbGciOiJIUzI1NiIs...
[INFO] Admin Referral Code: ADMIN123

[INFO] Test 2: Public user registration...
[SUCCESS] User registered successfully
[INFO] User ID: cm2xyz123...

[INFO] Test 3: PENDING user should NOT be able to login...
[SUCCESS] PENDING user correctly blocked from login

...

======================================
ALL TESTS COMPLETED
======================================
```

### 2. **Test Data Generator** (`generate-test-data.sh`)

**Mục đích**: Tạo dữ liệu test với cấu trúc MLM tree thực tế

**Tính năng**:
- Tạo users với tên tiếng Việt ngẫu nhiên
- Tự động approve sau khi đăng ký
- Tạo MLM tree đa cấp (F1 → F2 → F3)
- Tạo thêm PENDING users để test approval flow

**Cách chạy**:
```bash
# Default: 3 F1, mỗi F1 có 2 F2, mỗi F2 có 2 F3 (total: 21 users)
./generate-test-data.sh

# Custom structure: 5 F1, mỗi F1 có 3 F2, mỗi F2 có 2 F3
NUM_F1_USERS=5 NUM_F2_PER_F1=3 NUM_F3_PER_F2=2 ./generate-test-data.sh

# Large test data: 10 F1 users
NUM_F1_USERS=10 ./generate-test-data.sh
```

**Output mẫu**:
```
======================================
  TEST DATA GENERATOR
======================================

[GEN] Logging in as admin...
[OK] Admin logged in. Referral: ADMIN123

[GEN] Starting test data generation...
[GEN] Structure: 3 F1 users → 2 F2 each → 2 F3 each

[GEN] Creating F1 user #1: Nguyễn Văn An...
[OK] Created & approved: Nguyễn Văn An (F1) | Ref: F1ABC123

[GEN] Creating F2 user #1_1: Trần Thị Bình...
[OK] Created & approved: Trần Thị Bình (F2) | Ref: F2XYZ456

...

[OK] Generated 21 test users total

[GEN] Creating PENDING users for testing approval flow...
[OK] Created PENDING: Lê Minh Cường
[OK] Created PENDING: Phạm Anh Dũng
...

======================================
DATA GENERATION COMPLETE
======================================

Summary:
  - F1 users: 3
  - F2 users: 6
  - F3 users: 12
  - PENDING users: 5
  - Total: 26
```

## 🐛 Bug Fixes Verified

### BUG 1: UserTree Created for PENDING Users ✅ FIXED
**Trước**: `save()` tự động tạo UserTree cho mọi user, kể cả PENDING
**Sau**: Chỉ tạo UserTree cho ACTIVE users. PENDING users được tạo UserTree khi approve.

**Verification**: Test 7 kiểm tra UserTree chỉ tồn tại sau approval

### BUG 2: Route Order Conflict ✅ FIXED
**Trước**: `@Get('pending')` ở sau `@Get(':id')` → có thể bị catch nhầm
**Sau**: `@Get('pending')` di chuyển lên trước `@Get(':id')`

**Verification**: Test 4 gọi `/users/pending` thành công

### BUG 3: No Sponsor Status Validation ✅ FIXED
**Trước**: Có thể đăng ký với mã giới thiệu của user PENDING/REJECTED/BANNED
**Sau**: Chỉ cho phép đăng ký với sponsor có status = ACTIVE

**Verification**: Test 8 kiểm tra reject khi sponsor không ACTIVE

### BUG 4: Username Conflict in Re-registration ✅ FIXED
**Trước**: User REJECTED re-register có thể đè username của user khác
**Sau**: Check username conflict trước khi update

**Verification**: Test 9 kiểm tra re-registration với username mới

## 📊 Testing Best Practices

### Before Production Deploy:
```bash
# 1. Run full test suite
./test-flow.sh

# 2. Generate test data để test manual
./generate-test-data.sh

# 3. Test các edge cases:
#    - Đăng ký với referral code không tồn tại
#    - Đăng ký với email/username đã tồn tại
#    - Approve/reject user nhiều lần
#    - Login với sai password
#    - Test commission calculations
```

### Continuous Testing:
```bash
# Chạy test suite mỗi khi có thay đổi code
git commit -m "..." && ./test-flow.sh

# Hoặc setup git hook:
cat << 'EOF' > .git/hooks/pre-push
#!/bin/bash
echo "Running test suite before push..."
./test-flow.sh
EOF
chmod +x .git/hooks/pre-push
```

## 🔍 Manual Testing Checklist

Sau khi chạy automated tests, kiểm tra thủ công:

### Frontend Testing:
- [ ] Đăng ký qua trang `/signup` với referral code hợp lệ
- [ ] Kiểm tra message "Tài khoản đang chờ phê duyệt" khi login
- [ ] Admin vào trang `/admin/users/pending` → thấy users mới
- [ ] Click "Phê duyệt" → user biến mất khỏi danh sách
- [ ] User login lại → thành công
- [ ] Vào trang `/account` → thấy referral code của mình

### Edge Cases:
- [ ] Đăng ký với mã giới thiệu không tồn tại → Error rõ ràng
- [ ] Đăng ký với mã của user PENDING → Error "trạng thái..."
- [ ] Username/email đã tồn tại → Error "đã tồn tại"
- [ ] User bị reject → Login thấy lý do reject
- [ ] User bị reject → Re-register với email cũ → Thành công

### Commission Testing:
- [ ] Tạo order với user F3
- [ ] Check F2 (sponsor) nhận hoa hồng
- [ ] Check F1 (sponsor của sponsor) nhận hoa hồng
- [ ] Check ADMIN không nhận hoa hồng từ F1 do admin tạo

## 🎯 Performance Testing

```bash
# Test với 100 users
NUM_F1_USERS=10 NUM_F2_PER_F1=5 NUM_F3_PER_F2=2 ./generate-test-data.sh

# Measure API response time
time curl -X GET "http://localhost:3000/api/v1/users/tree" \
  -H "Authorization: Bearer $TOKEN"

# Check database connections
# Nếu slow, cần optimize queries hoặc add indexes
```

## 📝 Logging & Debugging

### Enable detailed logs:
```bash
# Backend logs
tail -f backend.log

# Database queries
# Set in .env: DATABASE_URL với ?logging=true

# Test script debug
bash -x ./test-flow.sh
```

## 🚨 Common Issues

### Test fails: "Failed to login as admin"
```bash
# Check admin exists in database
npx prisma studio
# Or create admin manually
npm run admin:create
```

### Test fails: "Connection refused"
```bash
# Make sure backend is running
lsof -i :3000
npm run start:dev
```

### Test fails: "Mã giới thiệu không tồn tại"
```bash
# Admin referral code might have changed
# Update ADMIN_EMAIL in test script
```

## 💡 Tips

1. **Reset database khi cần**:
   ```bash
   npx prisma db push --force-reset
   npm run admin:create
   ```

2. **Xem users được tạo**:
   ```bash
   npx prisma studio
   # Mở http://localhost:5555
   ```

3. **Export test data**:
   ```bash
   # Backup database with test data
   mysqldump -u root -p mlm_ecommerce > test_data.sql
   ```

4. **Load test với Apache Bench**:
   ```bash
   ab -n 1000 -c 10 http://localhost:3000/api/v1/users/pending
   ```

---

## ✅ Success Criteria

Hệ thống đạt chuẩn production khi:
- [x] Tất cả tests trong `test-flow.sh` PASS
- [x] Generate 100+ users không có lỗi
- [x] Không có bugs nghiêm trọng
- [x] API response time < 200ms
- [x] Frontend flows hoạt động mượt
- [x] Commissions tính toán chính xác

**Happy Testing! 🎉**
