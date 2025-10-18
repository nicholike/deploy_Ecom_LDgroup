# 🐛 Debug SePay Webhook - TPBank

## ❌ Vấn đề hiện tại:
- QR code hoạt động ✅
- Nội dung có `TKPYRK` ✅  
- Webhook từ SePay không được gọi ❌

## 🔍 Nguyên nhân có thể:

### 1. **TPBank không tự động gửi webhook**
- TPBank là ngân hàng gián tiếp, có thể không gửi webhook tự động
- Cần cấu hình thủ công trên SePay dashboard

### 2. **Webhook URL chưa đúng**
- Cần kiểm tra URL webhook trên SePay
- Cần test webhook endpoint

### 3. **SePay chưa được cấu hình cho TPBank**
- Cần đăng ký tài khoản TPBank trên SePay
- Cần cấu hình webhook cho TPBank

## 🛠️ Các bước debug:

### Bước 1: Kiểm tra Railway Domain
```bash
# Lấy domain Railway hiện tại
railway status
# Hoặc vào Railway Dashboard → Settings → Networking
```

### Bước 2: Test Webhook Endpoint
```bash
# Test webhook endpoint có hoạt động không
curl -X POST https://YOUR-DOMAIN.up.railway.app/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=" \
  -d '{"test": "webhook"}'
```

### Bước 3: Kiểm tra SePay Dashboard
1. Vào https://my.sepay.vn
2. Đăng nhập tài khoản SePay
3. Kiểm tra **Webhook Settings**:
   - URL: `https://YOUR-DOMAIN.up.railway.app/api/v1/payment/sepay-webhook`
   - Authorization: `Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=`

### Bước 4: Kiểm tra TPBank Integration
1. Trong SePay dashboard, kiểm tra **Bank Integration**
2. Xem TPBank có được kích hoạt không
3. Kiểm tra **Transaction Monitoring**

### Bước 5: Kiểm tra Railway Logs
1. Vào Railway Dashboard
2. Click **Backend Service** → **Deployments**
3. Click **View Logs**
4. Tìm log webhook khi có giao dịch

## 🔧 Giải pháp:

### Giải pháp 1: Cấu hình SePay cho TPBank
1. **Đăng ký tài khoản TPBank** trên SePay (nếu chưa có)
2. **Cấu hình webhook** cho TPBank
3. **Test webhook** với giao dịch thử

### Giải pháp 2: Sử dụng BIDV (Direct VA)
- BIDV có VA trực tiếp, webhook hoạt động tốt hơn
- Có thể chuyển về BIDV nếu TPBank không ổn định

### Giải pháp 3: Manual Processing
- Tạo admin panel để xử lý giao dịch thủ công
- Admin nhập thông tin giao dịch để tạo đơn hàng

## 📞 Liên hệ SePay Support:
- Email: support@sepay.vn
- Hotline: 1900 636 999
- Hỏi về webhook integration với TPBank

## 🧪 Test ngay:

### Test 1: Kiểm tra webhook endpoint
```bash
curl -X POST https://YOUR-DOMAIN.up.railway.app/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook", "amount_in": 100000, "transaction_content": "TKPYRK PD25TEST01"}'
```

### Test 2: Kiểm tra Railway logs
- Tạo giao dịch thử
- Xem logs có webhook không
- Nếu không có → vấn đề ở SePay/TPBank

## ⚠️ Lưu ý quan trọng:

1. **TPBank là ngân hàng gián tiếp** - có thể không gửi webhook tự động
2. **Cần cấu hình thủ công** trên SePay dashboard
3. **Test với BIDV** để so sánh (nếu có tài khoản BIDV)
4. **Liên hệ SePay support** nếu cần hỗ trợ

## 🎯 Kết quả mong đợi:

Sau khi fix, khi có giao dịch:
1. SePay gửi webhook về backend
2. Backend log: `📥 Received SePay webhook: {...}`
3. Backend xử lý và tạo đơn hàng
4. Frontend cập nhật trạng thái thanh toán
