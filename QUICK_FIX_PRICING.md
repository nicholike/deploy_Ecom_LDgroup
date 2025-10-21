# 🔧 QUICK FIX: LỖI GIÁ KHÔNG ĐÚNG

## Vấn đề hiện tại:
- ❌ Admin không save được giá → Error 500
- ❌ Giá cart = 12,375,000đ (sai) → Đúng phải là 12,775,000đ

## Nguyên nhân:
Backend đang dùng giá **99,000đ cho tất cả tier** thay vì:
- Bội 100: 99,000đ ✅
- Bội 10: 109,000đ ❌ (đang dùng 99k)
- Lẻ: 139,000đ ❌ (đang dùng 99k)

## Fix ngay:

### Option 1: Fix qua Database (NHANH NHẤT)

```sql
-- Connect to MySQL
mysql -u dieplai -pdieplai ecommerce_ldgroup

-- Insert hoặc update global pricing
INSERT INTO system_settings
(`key`, `value`, `type`, `category`, `label`, `description`, `required`, `editable`)
VALUES
('global_product_pricing',
'{"5ml":{"tier100":99000,"tier10":109000,"single":139000},"20ml":{"tier100":330000,"tier10":360000,"single":450000}}',
'JSON',
'PRICING',
'Cấu hình giá sản phẩm toàn cục',
'Giá theo bội số cho sản phẩm 5ml và 20ml',
1,
1)
ON DUPLICATE KEY UPDATE
`value` = '{"5ml":{"tier100":99000,"tier10":109000,"single":139000},"20ml":{"tier100":330000,"tier10":360000,"single":450000}}';

-- Check kết quả
SELECT * FROM system_settings WHERE `key` = 'global_product_pricing'\G
```

Sau đó:
```bash
# Restart backend để clear cache
cd backend
npm run start:dev
```

### Option 2: Fix qua API (cần Postman/curl)

```bash
# 1. Login admin để lấy token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Copy accessToken từ response

# 2. Update pricing
curl -X PUT http://localhost:3000/api/v1/admin/settings/pricing/global \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "5ml": {"tier100": 99000, "tier10": 109000, "single": 139000},
    "20ml": {"tier100": 330000, "tier10": 360000, "single": 450000}
  }'
```

### Option 3: Debug Frontend (để tìm lỗi)

1. Mở DevTools Console
2. Vào tab "Giá sản phẩm"
3. Xem console log:
   ```
   Loaded pricing data: {...}
   ```
4. Nhập giá → Click "Lưu cấu hình"
5. Xem console log:
   ```
   Saving pricing: {...}
   5ml pricing: {...}
   20ml pricing: {...}
   ```
6. Screenshot và gửi cho tôi

## Test sau khi fix:

```bash
# 1. Restart backend
cd backend
npm run start:dev

# 2. Test cart
- Thêm 125 chai 5ml
- Kiểm tra giá = 12,775,000đ ✅

# 3. Test các số khác
- 100 chai = 9,900,000đ
- 110 chai = 11,090,000đ
- 10 chai = 1,090,000đ
- 5 chai = 695,000đ
```

## Nếu vẫn lỗi:

Check variant có price tiers cũ không:
```sql
SELECT pv.*, pt.*
FROM product_variants pv
LEFT JOIN price_tiers pt ON pt.product_variant_id = pv.id
WHERE pv.size = '5ml'
LIMIT 5;

-- Nếu có price_tiers, xóa đi
DELETE FROM price_tiers;
```
