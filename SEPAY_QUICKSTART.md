# 🚀 SePay Webhook - Quick Start

## 📋 TL;DR - Bắt đầu ngay trong 5 phút

### ✅ Đã có sẵn:
- ✅ Backend code hoàn chỉnh
- ✅ Frontend code hoàn chỉnh
- ✅ Database schema
- ✅ API Keys đã generate
- ✅ Test scripts

### 🎯 Điều bạn cần làm:

#### **Option 1: Test Local với Ngrok (Khuyên dùng cho lần đầu)**

```bash
# 1. Cài ngrok (nếu chưa có)
# Download tại: https://ngrok.com/download
# Sau đó: ngrok authtoken YOUR_TOKEN

# 2. Chạy backend (Terminal 1)
cd backend
npm run start:dev

# 3. Chạy script setup ngrok (Terminal 2)
./setup-ngrok-webhook.sh

# 4. Copy webhook URL từ output, paste vào SePay Dashboard
# https://my.sepay.vn > Webhooks > Tạo mới

# 5. Test bằng script
./test-sepay-local.sh ORD-20251013-001 100000
```

#### **Option 2: Test Local đơn giản (Không cần ngrok, không cần webhook thật)**

```bash
# 1. Chạy backend
cd backend
npm run start:dev

# 2. Tạo đơn hàng trên frontend
# Lấy mã đơn hàng (VD: ORD-20251013-001)

# 3. Test bằng script giả lập
./test-sepay-local.sh ORD-20251013-001 100000
```

---

## 🔑 Thông tin cần thiết

### API Keys (đã generate sẵn trong `.env`):
```
API Key: Hk+Ab7BLFPP0bOuzCsf18hVIHVlL/Ee12BMEDVEHt4s=
Secret: b051b138f1e5ea67fbb72a2ce90c730d64e0b2e54b8ee641a72105f3e32f8fc2
```

### Bank Account (đã có sẵn):
```
Ngân hàng: BIDV
Số TK: 6201235752
Chủ TK: DIEP DUC LAI
Virtual Account: 96247LAI712004
```

### Webhook URL Format:
```
Local (với ngrok): https://YOUR-NGROK-URL.ngrok.io/api/v1/payment/sepay-webhook
Production: https://yourdomain.com/api/v1/payment/sepay-webhook
```

---

## 📊 Flow hoạt động

```
User đặt hàng → Nhận QR code → Quét & chuyển tiền → SePay webhook →
Backend xử lý → Update order → Notify user → Success!
```

---

## 🧪 Test Scenarios

### Scenario 1: Test nhanh với script (Khuyên dùng)
```bash
# Tạo đơn hàng trên frontend trước
./test-sepay-local.sh ORD-20251013-001 100000
```
✅ Không cần chuyển tiền thật
✅ Không cần webhook thật
✅ Nhanh nhất

### Scenario 2: Test với ngrok + SePay webhook thật
```bash
./setup-ngrok-webhook.sh
# Sau đó cấu hình webhook trên SePay Dashboard
# Tạo đơn hàng và test bằng chuyển khoản ít tiền (10,000 VND)
```
✅ Giống production nhất
✅ Test webhook thật
⚠️ Cần setup ngrok và SePay

### Scenario 3: Deploy production
```bash
# Deploy backend lên server
# Update webhook URL trên SePay với domain thật
# https://yourdomain.com/api/v1/payment/sepay-webhook
```
✅ Webhook tự động
✅ Không cần ngrok

---

## 📂 Files quan trọng

| File | Mô tả |
|------|-------|
| `backend/.env` | Chứa API keys và bank info |
| `SEPAY_WEBHOOK_SETUP.md` | Hướng dẫn chi tiết setup webhook |
| `TEST_PAYMENT_LOCAL.md` | Hướng dẫn test local |
| `setup-ngrok-webhook.sh` | Script tự động setup ngrok |
| `test-sepay-local.sh` | Script test webhook giả lập |
| `backend/src/infrastructure/services/payment/` | Payment logic |
| `backend/src/presentation/http/controllers/payment.controller.ts` | Webhook endpoint |

---

## 🔧 Setup Webhook trên SePay (Nếu dùng ngrok)

1. **Chạy script setup:**
   ```bash
   ./setup-ngrok-webhook.sh
   ```

2. **Copy webhook URL** từ output

3. **Vào SePay Dashboard:**
   - Login: https://my.sepay.vn
   - Menu: Cài đặt > Webhooks
   - Click: Tạo webhook mới

4. **Điền thông tin:**
   - Webhook URL: [paste URL từ script]
   - API Key: `Hk+Ab7BLFPP0bOuzCsf18hVIHVlL/Ee12BMEDVEHt4s=`
   - Secret: `b051b138f1e5ea67fbb72a2ce90c730d64e0b2e54b8ee641a72105f3e32f8fc2`
   - Events: All Events

5. **Save & Test**

---

## ❓ FAQs

**Q: Tôi có cần API key không?**
A: SePay có thể không bắt buộc API key cho webhook. Nếu họ không yêu cầu, bỏ qua field này.

**Q: Ngrok URL thay đổi mỗi lần restart?**
A: Đúng (free tier). Phải update lại webhook URL trên SePay.

**Q: Có thể test local mà không cần ngrok?**
A: Có! Dùng script `test-sepay-local.sh` để giả lập webhook.

**Q: Production deploy như thế nào?**
A: Deploy backend lên server, có HTTPS domain, update webhook URL trên SePay.

**Q: Webhook không hoạt động?**
A: Check:
- Backend đang chạy?
- Ngrok đang chạy?
- Webhook URL đúng format?
- Logs có lỗi gì không?

---

## 📚 Đọc thêm

- **Chi tiết setup**: `SEPAY_WEBHOOK_SETUP.md`
- **Test local**: `TEST_PAYMENT_LOCAL.md`
- **SePay docs**: https://docs.sepay.vn
- **Payment setup**: `backend/PAYMENT_SETUP.md`

---

## ✅ Checklist trước khi test

- [ ] Backend chạy ở port 3000
- [ ] Database đã migrate
- [ ] Có đơn hàng test với mã rõ ràng
- [ ] (Nếu dùng ngrok) Đã cài và authenticate ngrok
- [ ] (Nếu dùng webhook thật) Đã cấu hình webhook trên SePay

---

## 🎉 Kết quả mong đợi

Sau khi test thành công:

✅ Backend log hiển thị webhook received
✅ Order status → `COMPLETED`
✅ Payment status → `COMPLETED`
✅ Bank transaction được lưu vào DB
✅ User nhận notification
✅ Frontend tự động cập nhật "Thanh toán thành công"

---

**Need help?** Xem file `SEPAY_WEBHOOK_SETUP.md` để biết thêm chi tiết!
