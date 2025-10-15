# Hướng dẫn Fix Sepay Webhook 405 Error

## Vấn đề
Sepay webhook trả về lỗi **405 Method Not Allowed** vì đang POST tới URL sai.

**Sai:** `https://doitac.ldgroup.vn/` (root path)
**Đúng:** `https://doitac.ldgroup.vn/api/v1/payment/sepay-webhook` (full endpoint path)

## Cách fix

### Bước 1: Login vào Sepay Dashboard
1. Truy cập https://my.sepay.vn/
2. Đăng nhập với tài khoản của bạn

### Bước 2: Cấu hình Webhook URL
1. Vào menu **Tài khoản ảo** hoặc **Virtual Account**
2. Click vào VA `96247LAI712004` (VA của bạn)
3. Tìm mục **Webhook URL** hoặc **URL nhận thông báo**
4. Nhập URL mới:
   ```
   https://doitac.ldgroup.vn/api/v1/payment/sepay-webhook
   ```
5. **Lưu lại**

### Bước 3: Test Webhook
1. Tạo 1 đơn hàng test (số tiền nhỏ: 1,000đ - 2,000đ)
2. Quét QR code
3. Chuyển khoản với đúng nội dung (VD: `LD25101500009`)
4. Kiểm tra:
   - Sepay dashboard → Webhook logs → Status code phải là **200**
   - Backend logs → Phải thấy log `📥 Received SePay webhook`
   - Frontend → Tự động chuyển sang màn hình "Thanh toán thành công"

## Webhook Data Format

Sepay sẽ gửi POST request với body:
```json
{
  "gateway": "BIDV",
  "transactionDate": "2025-10-15 15:21:19",
  "accountNumber": "6201235752",
  "subAccount": "96247LAI712004",
  "transferAmount": 2200,
  "content": "LD25101500009 FT25288900854750",
  "referenceCode": "d671aac2-06f9-49a4-9331-ac0244175bba",
  "id": 26389818
}
```

Backend sẽ:
1. Parse data
2. Extract order code từ `content` (regex: `LD\d{11}`)
3. Match với order trong database
4. Update payment status → `COMPLETED`
5. Tạo notification cho user

## Flow hoàn chỉnh

```
User checkout → Tạo order → Frontend redirect đến /payment/:orderId
    ↓
Frontend load payment info → Hiển thị QR code (1 lần)
    ↓
User quét QR → Chuyển khoản với nội dung chính xác
    ↓
Sepay nhận tiền → Gửi webhook → Backend API
    ↓
Backend parse webhook → Match order → Update payment status
    ↓
Frontend polling (5s) detect status changed → Show success → Redirect
```

## Troubleshooting

### Vẫn lỗi 405
- Check lại URL webhook có đúng **FULL PATH** không
- Check Railway có deploy code mới chưa: `railway status`
- Check logs: `railway logs`

### Webhook không được gọi
- Kiểm tra Sepay VA có hoạt động không
- Kiểm tra domain `doitac.ldgroup.vn` có trỏ đúng Railway không
- Test endpoint bằng curl:
  ```bash
  curl -X GET https://doitac.ldgroup.vn/api/v1/payment/sepay-webhook
  # Phải return: {"success":true,"message":"Webhook endpoint is ready"}
  ```

### Order không được update
- Check logs xem có nhận webhook không
- Check order code trong content có đúng format không (`LD` + 11 số)
- Check amount có khớp với order total không (tolerance 1%)

## Notes
- Virtual Account: `96247LAI712004`
- Bank: BIDV
- Real bank account: `6201235752`
- Order prefix: `LD` (VD: `LD25101500009`)
