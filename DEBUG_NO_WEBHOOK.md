# 🚨 Debug: SePay Không Gửi Webhook

## ❌ **Vấn đề:**
- Webhook logs không có gì
- SePay không gửi webhook khi có giao dịch TPBank
- Giao dịch thật không được xử lý tự động

## 🔍 **Nguyên nhân có thể:**

### **1. SePay Webhook Chưa Kích Hoạt**
- TPBank có thể cần cấu hình đặc biệt
- SePay chưa enable webhook cho TPBank
- Cần liên hệ SePay support

### **2. Cấu Hình Webhook Sai**
- URL webhook không đúng
- Authorization header sai
- Event trigger không đúng

### **3. TPBank Không Support Webhook**
- TPBank là ngân hàng gián tiếp
- Có thể không gửi webhook tự động
- Cần polling hoặc manual processing

## 🛠️ **Giải pháp:**

### **Giải pháp 1: Kiểm tra SePay Dashboard**

1. **Vào https://my.sepay.vn**
2. **Kiểm tra Webhook Settings:**
   - URL: `https://deployecomldgroup-production.up.railway.app/api/v1/payment/sepay-webhook`
   - Authorization: `Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=`
   - Event: "Cả hai" (Both incoming/outgoing)
   - Account: "TPBank - 85558888999"

3. **Kiểm tra Transaction Monitoring:**
   - Xem có giao dịch TPBank nào không
   - Xem có webhook logs không

### **Giải pháp 2: Test Webhook Thủ Công**

```bash
# Test webhook endpoint
curl -X POST https://deployecomldgroup-production.up.railway.app/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=" \
  -d '{
    "id": "test_manual_001",
    "transaction_date": "2025-10-18T13:00:00.000Z",
    "transaction_content": "PD25TEST01",
    "amount_in": 100000,
    "sub_account": ""
  }'
```

### **Giải pháp 3: Chuyển về BIDV (Khuyến nghị)**

```bash
# Cập nhật Railway Variables:
BANK_ACCOUNT_NUMBER=6201235752
BANK_ACCOUNT_NAME=DIEP DUC LAI
BANK_CODE=BIDV
BANK_NAME=BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam
# Xóa SEPAY_VA_NUMBER và SEPAY_VA_PREFIX
```

**Lý do:**
- ✅ BIDV có VA trực tiếp
- ✅ Webhook hoạt động 100%
- ✅ Đã test thành công trước đó

### **Giải pháp 4: Tạo Polling Job**

Tạo job chạy mỗi 5 phút để:
1. Gọi SePay API lấy giao dịch mới
2. So sánh với pending orders
3. Tự động tạo đơn hàng

```typescript
@Cron('*/5 * * * *')
async checkNewTransactions() {
  // Gọi SePay API
  // Lấy giao dịch mới
  // Match với pending orders
  // Tạo đơn hàng
}
```

## 📞 **Liên hệ SePay Support:**

**Email**: support@sepay.vn
**Hotline**: 1900 636 999

**Hỏi về:**
- TPBank webhook integration
- Tại sao không gửi webhook cho TPBank
- Cách cấu hình webhook cho TPBank

## 🎯 **Khuyến nghị:**

### **Ngay lập tức:**
1. **Chuyển về BIDV** - webhook hoạt động 100%
2. **Test với BIDV** để xác nhận
3. **Sau đó mới tìm hiểu TPBank**

### **Dài hạn:**
1. **Liên hệ SePay** về TPBank webhook
2. **Tạo polling job** nếu cần giữ TPBank
3. **Tạo admin panel** xử lý thủ công

## 🔧 **Các bước thực hiện:**

### **Bước 1: Test webhook thủ công**
```bash
curl -X POST https://deployecomldgroup-production.up.railway.app/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=" \
  -d '{"test": "manual"}'
```

### **Bước 2: Kiểm tra SePay Dashboard**
- Xem webhook settings
- Xem transaction monitoring
- Xem webhook logs

### **Bước 3: Quyết định**
- **Nếu SePay có webhook logs** → Vấn đề ở backend
- **Nếu SePay không có webhook logs** → Vấn đề ở SePay/TPBank
- **Khuyến nghị: Chuyển về BIDV** 🚀
