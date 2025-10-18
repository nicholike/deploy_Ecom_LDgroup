# 🧪 Test với Pending Order Thật

## ✅ **Kết quả test webhook:**
- **Webhook hoạt động**: ✅ SePay đã gửi webhook
- **Transaction lưu**: ✅ Database đã lưu giao dịch
- **Vấn đề**: Không có pending order `PD25TEST01` để match

## 🎯 **Cách test đúng:**

### **Bước 1: Tạo Pending Order Thật**
1. Vào website frontend
2. Thêm sản phẩm vào giỏ hàng
3. Click "Thanh toán" 
4. Lấy **mã pending order** (VD: `PD25XXXXX`)

### **Bước 2: Test Webhook với Mã Thật**
```bash
curl -X POST https://deployecomldgroup-production.up.railway.app/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey H+sJyl+wt8fwNrqliLOx/E97gw/3QV3zzHtyZswzoK0=" \
  -d '{
    "test": "webhook", 
    "amount_in": 100000, 
    "transaction_content": "PD25XXXXX", 
    "transaction_date": "2025-10-18T13:00:00.000Z"
  }'
```

### **Bước 3: Kiểm tra Kết quả**
- Nếu match thành công → `"Payment confirmed and order created successfully"`
- Nếu không match → `"Transaction saved but not matched"`

## 🔍 **Debug Steps:**

### **1. Kiểm tra Pending Orders trong Database**
```sql
SELECT * FROM pending_orders 
WHERE pending_number LIKE 'PD25%' 
ORDER BY created_at DESC 
LIMIT 10;
```

### **2. Kiểm tra Bank Transactions**
```sql
SELECT * FROM bank_transactions 
WHERE transaction_content LIKE 'PD25%' 
ORDER BY created_at DESC 
LIMIT 10;
```

### **3. Kiểm tra Railway Logs**
- Railway Dashboard → Deployments → View Logs
- Tìm log webhook processing

## 🎯 **Kết luận:**

**Webhook hoạt động hoàn hảo!** Vấn đề chỉ là:
- ✅ SePay gửi webhook OK
- ✅ Backend xử lý OK  
- ❌ Không có pending order thật để match

**Giải pháp**: Tạo pending order thật và test với mã thật! 🚀
