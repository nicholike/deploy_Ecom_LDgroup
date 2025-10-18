# 🏦 Cập nhật Environment Variables cho TPBank

## ✅ Code đã được deploy lên GitHub

Railway sẽ **tự động build lại** backend sau khi phát hiện code mới.

## 📋 Cần update các biến sau trên Railway:

1. Vào Railway Dashboard: https://railway.app
2. Chọn project → Backend service
3. Click tab **Variables**
4. **Cập nhật** các biến sau:

```bash
# Thông tin tài khoản TPBank (thay thế BIDV cũ)
BANK_ACCOUNT_NUMBER=85558888999
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=TPBank
BANK_NAME=TPBank

# Thông tin Virtual Account
SEPAY_VA_NUMBER=YRK
SEPAY_VA_PREFIX=TKP
```

## ⚠️ LƯU Ý QUAN TRỌNG:

### 1. Format nội dung chuyển khoản:
- **Nội dung QR sẽ tự động tạo theo format**: `TKPYRK PD25XXXXX`
- Trong đó:
  - `TKP` = Tiền tố (prefix)
  - `YRK` = Virtual Account của bạn
  - `PD25XXXXX` = Mã đơn hàng

### 2. Khách hàng chuyển khoản:
- **Tài khoản nhận**: 85558888999
- **Ngân hàng**: TPBank
- **Nội dung**: TKPYRK PD25XXXXX (được tạo tự động trong QR)

### 3. Webhook từ SePay:
- Khi khách chuyển khoản với nội dung `TKPYRK PD25XXXXX`
- SePay sẽ gửi webhook về backend
- Backend sẽ tự động **extract mã đơn hàng** `PD25XXXXX` từ content
- So khớp với pending order và tạo đơn hàng thực

## 🧪 Test cấu hình:

Sau khi update variables trên Railway, chạy lệnh test:

```bash
railway run node backend/check-sepay-env.js
```

Kết quả mong đợi:
```
✅ SEPAY_VA_NUMBER: YRK
✅ SEPAY_VA_PREFIX: TKP
✅ BANK_CODE: TPBank
✅ BANK_NAME: TPBank
✅ BANK_ACCOUNT_NUMBER: 85558888999
✅ BANK_ACCOUNT_NAME: DIEP DUC LAI

📝 QR Code URL Preview:
https://qr.sepay.vn/img?acc=85558888999&bank=TPBank&amount=100000&des=TKPYRK%20PD25101800001

Expected transaction content format:
"TKPYRK PD25101800001"
```

## 📱 Test thanh toán thực tế:

1. Tạo đơn hàng trên website
2. Quét QR code
3. Kiểm tra nội dung chuyển khoản đã có format: `TKPYRK PD25XXXXX`
4. Chuyển khoản
5. Chờ webhook từ SePay (thường 1-5 giây)
6. Kiểm tra đơn hàng đã được tạo thành công

## ❓ Xử lý lỗi:

### Lỗi: "No pending order code found"
- **Nguyên nhân**: Nội dung chuyển khoản không đúng format
- **Giải pháp**: Đảm bảo nội dung có `TKPYRK PD25...`

### Lỗi: "Pending order not found"
- **Nguyên nhân**: Mã đơn hàng không tồn tại hoặc đã hết hạn
- **Giải pháp**: Tạo đơn hàng mới (pending order có thời hạn 30 phút)

### Lỗi: "Amount mismatch"
- **Nguyên nhân**: Số tiền chuyển khoản không khớp với đơn hàng
- **Giải pháp**: Chuyển đúng số tiền trong QR code

## 🎯 Tóm tắt các thay đổi:

✅ **Backend code**: 
- Đã support TPBank format
- Tự động thêm prefix `TKPYRK` vào QR code
- Tự động extract mã đơn hàng từ webhook

✅ **Environment variables**:
- Đã cập nhật trong file `RAILWAY_ENV_VARIABLES.txt`
- Cần copy-paste vào Railway dashboard

✅ **Build & Deploy**:
- Code đã push lên GitHub
- Railway sẽ tự động deploy
- Chờ 2-3 phút để Railway build xong

## 🚀 Sau khi Railway deploy xong:

1. **Kiểm tra logs**: Railway dashboard → Deployments → View logs
2. **Test webhook**: Tạo đơn hàng thử và thanh toán
3. **Monitor**: Theo dõi logs khi có giao dịch

---

**✨ Lưu ý**: Hệ thống vẫn **backward compatible** với BIDV. Nếu không có `SEPAY_VA_PREFIX`, sẽ dùng format cũ (chỉ mã đơn hàng).

