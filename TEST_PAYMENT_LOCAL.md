# 🧪 Hướng dẫn Test Payment Local (Không cần Sepay Webhook thật)

## 📝 Tóm tắt Flow:

1. **Đặt hàng** → Tạo Order (status: `PENDING`, paymentStatus: `PENDING`)
2. **Xem QR Code** → Frontend hiển thị QR code (VietQR API)
3. **Giả lập thanh toán** → Gọi API test-webhook (simulate Sepay webhook)
4. **Kiểm tra** → Order được cập nhật thành `PAID`

---

## 🎯 Các bước test:

### 1. Đặt hàng và lấy Order Number

1. Mở browser: http://localhost:5173/cart-checkout
2. Đăng nhập (demo account hoặc bất kỳ)
3. Thêm sản phẩm vào giỏ
4. Checkout → Đặt hàng
5. **LƯU LẠI MÃ ĐơN HÀNG** (ví dụ: `ORD-20251013-001`)

### 2. Xem QR Code

Sau khi đặt hàng, tự động redirect đến:
```
http://localhost:5173/payment/{orderId}
```

Bạn sẽ thấy:
- ✅ QR Code hiển thị (ảnh từ VietQR)
- ✅ Thông tin ngân hàng: BIDV - 6201235752
- ✅ Số tiền cần chuyển
- ✅ Nội dung chuyển khoản (mã đơn hàng)

**Screenshot QR Code URL:**
```
https://img.vietqr.io/image/BIDV-6201235752-compact2.jpg?amount=1000000&addInfo=ORD-20251013-001&accountName=DIEP%20DUC%20LAI
```

### 3. Giả lập Webhook (Simulate thanh toán thành công)

**Thay `ORD-20251013-001` bằng mã đơn hàng của bạn:**

```bash
curl -X POST http://localhost:3000/api/v1/payment/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "ORD-20251013-001"
  }'
```

**Hoặc dùng Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/v1/payment/test-webhook`
- Body (JSON):
```json
{
  "orderCode": "ORD-20251013-001"
}
```

### 4. Kiểm tra kết quả

**Frontend (Payment page):**
- QR code biến mất
- Hiển thị ✅ "Thanh toán thành công!"
- Tự động redirect về `/account` sau 5 giây

**Backend logs:**
```
Webhook received for order: ORD-20251013-001
✅ Payment confirmed, order updated
```

**Database:**
```sql
-- Order status
SELECT orderNumber, status, paymentStatus, paidAt 
FROM orders 
WHERE orderNumber = 'ORD-20251013-001';

-- Bank transaction
SELECT * FROM bank_transactions 
WHERE orderId = (SELECT id FROM orders WHERE orderNumber = 'ORD-20251013-001');
```

---

## 🚀 Production Flow (khi deploy lên server thật):

### Khi deploy production:

1. **User quét QR → Chuyển tiền thật** vào TK BIDV 6201235752
2. **Sepay phát hiện giao dịch** → Tự động gửi webhook:
   ```
   POST https://laistore.online/api/v1/payment/sepay-webhook
   ```
3. **Backend xử lý webhook** → Cập nhật order tự động
4. **User thấy** "Thanh toán thành công!" ngay lập tức

### Điều kiện để webhook hoạt động:

✅ **Domain public** (laistore.online) - HTTPS  
✅ **Webhook URL** đã cấu hình trong Sepay Dashboard  
✅ **Backend đang chạy** và accessible từ internet  

---

## 🐛 Troubleshooting:

### Lỗi: "Failed to load payment info"
- ✅ Check backend đang chạy: `http://localhost:3000/api/v1/payment/info/{orderId}`
- ✅ Check token hợp lệ (đã login)

### Lỗi: QR Code không hiển thị
- ✅ Check VietQR URL: `https://img.vietqr.io/image/BIDV-6201235752-compact2.jpg`
- ✅ Check `.env` có `BANK_ACCOUNT_NUMBER=6201235752`

### Test webhook không hoạt động
- ✅ Check endpoint: `POST http://localhost:3000/api/v1/payment/test-webhook`
- ✅ Check `orderCode` đúng (không phải `orderId`)
- ✅ Check backend logs

---

## 📌 Notes:

1. **Local testing**: Dùng `test-webhook` endpoint để giả lập
2. **Production**: Sepay tự động gửi webhook thật
3. **QR Code**: Luôn hoạt động (VietQR API public)
4. **Webhook**: Chỉ hoạt động khi deploy production với domain public

---

**Happy Testing!** 🎉

