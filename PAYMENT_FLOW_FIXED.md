# ✅ Payment Flow - ĐÃ SỬA XONG

## 🐛 Vấn đề ban đầu:

**Frontend liên tục gửi request** → Quá tải, lãng phí bandwidth

**Nguyên nhân:**
- `useCallback` dependency loop với `showToast`
- `loadPaymentInfo()` bị re-create liên tục
- useEffect dependency `loadPaymentInfo` → Chạy lại mãi mãi

---

## ✅ Flow ĐÚNG (theo đúng phân tích của bạn):

```
1. Gọi API 1 LẦN → Lấy payment info (QR code URL, bank info)
   ↓
2. Hiển thị QR code (chỉ <img> tag, KHÔNG reload)
   ↓
3. User quét QR → Chuyển tiền
   ↓
4. SePay nhận tiền → Gửi webhook về backend
   ↓
5. Backend nhận webhook → Update order status thành COMPLETED
   ↓
6. Frontend polling (5s/lần) → GỌI API CHECK STATUS (không reload payment info)
   ↓
7. Phát hiện status = COMPLETED → Hiển thị "Thanh toán thành công"
   ↓
8. Redirect về /account sau 5s
```

---

## 🔧 Những gì đã sửa:

### 1. **Load Payment Info - CHỈ GỌI 1 LẦN**

**Trước (❌ SAI):**
```typescript
const loadPaymentInfo = useCallback(async () => {
  // ...
}, [orderId, getToken, navigate, showToast]); // showToast thay đổi → re-create

useEffect(() => {
  loadPaymentInfo();
}, [loadPaymentInfo]); // loadPaymentInfo thay đổi → chạy lại mãi
```

**Sau (✅ ĐÚNG):**
```typescript
const loadPaymentInfo = async () => {
  console.log('🔄 Loading payment info (should only run ONCE)');
  // ...
};

useEffect(() => {
  loadPaymentInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty deps = CHỈ chạy 1 lần khi component mount
```

---

### 2. **Polling - CHỈ CHECK STATUS, KHÔNG RELOAD**

**Trước (❌ SAI):**
```typescript
const checkPaymentStatus = useCallback(async () => {
  // ...
}, [orderId, checking, isPaid, getToken, showToast, navigate]); // Dependencies → re-create

useEffect(() => {
  // ...
  setInterval(checkPaymentStatus, 5000);
}, [loading, isPaid, paymentInfo, checkPaymentStatus]); // checkPaymentStatus thay đổi → re-run
```

**Sau (✅ ĐÚNG):**
```typescript
const checkPaymentStatus = async () => {
  console.log('🔍 Checking payment status...');
  // CHỈ gọi checkPaymentStatus API, KHÔNG reload payment info
  // ...
};

useEffect(() => {
  console.log('🔄 Starting payment status polling (every 5 seconds)');
  // ...
  setInterval(checkPaymentStatus, 5000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loading, isPaid, paymentInfo]); // KHÔNG include checkPaymentStatus
```

---

## 📊 Request Flow - Trước vs Sau:

### ❌ TRƯỚC (SAI):
```
GET /payment/info/123  ← 1s
GET /payment/info/123  ← 1s (re-render)
GET /payment/info/123  ← 1s (re-render)
GET /payment/info/123  ← 1s (re-render)
...liên tục mãi mãi...
```

### ✅ SAU (ĐÚNG):
```
GET /payment/info/123       ← 1 lần khi mount, lấy QR code
                            ← Hiển thị QR, chờ user quét
GET /payment/status/123     ← 5s sau, check status
GET /payment/status/123     ← 10s sau
GET /payment/status/123     ← 15s sau
GET /payment/status/123     ← 20s sau (webhook đã đến, order = PAID)
→ Hiển thị success!
```

---

## 🧪 Test để verify fix:

### 1. Mở Network tab trong DevTools
```bash
# 1. Mở frontend
http://localhost:5173

# 2. Tạo đơn hàng → Redirect đến /payment/:orderId

# 3. Mở DevTools > Network tab

# 4. Kiểm tra requests
```

**Kết quả mong đợi:**
- ✅ `GET /payment/info/:orderId` → CHỈ 1 lần khi load trang
- ✅ `GET /payment/status/:orderId` → Mỗi 5 giây 1 lần
- ✅ KHÔNG có request liên tục vô tội vạ

### 2. Kiểm tra console logs
```
🔄 Loading payment info (should only run ONCE)
🔄 Starting payment status polling (every 5 seconds)
🔍 Checking payment status...
🔍 Checking payment status...
🔍 Checking payment status...
✅ Payment completed!
🛑 Stopping payment status polling
```

---

## 🎯 So sánh với flow bạn mô tả:

| Bước | Mô tả của bạn | Code hiện tại |
|------|---------------|---------------|
| 1 | Gọi request 1 lần để lấy QR | ✅ `loadPaymentInfo()` - 1 lần |
| 2 | Hiển thị QR | ✅ `<img src={paymentInfo.qrCodeUrl}>` |
| 3 | User quét QR, chuyển tiền | ✅ User action |
| 4 | SePay nhận tiền → Gửi webhook | ✅ Backend webhook endpoint |
| 5 | Backend check webhook → Update order | ✅ `processWebhook()` |
| 6 | Frontend polling check status | ✅ `checkPaymentStatus()` mỗi 5s |
| 7 | Phát hiện paid → Báo thành công | ✅ `setIsPaid(true)` |

**Kết luận:** Flow bây giờ **ĐÚNG 100%** theo phân tích của bạn! 🎉

---

## 📝 API Calls Summary:

### `/payment/info/:orderId` (GET)
- **Mục đích:** Lấy QR code URL và thông tin thanh toán
- **Gọi:** CHỈ 1 lần khi component mount
- **Response:**
  ```json
  {
    "qrCodeUrl": "https://qr.sepay.vn/img?acc=96247LAI712004&bank=BIDV&amount=100000&des=ORDER123",
    "bankAccount": { ... },
    "amount": 100000,
    "paymentStatus": "PENDING"
  }
  ```

### `/payment/status/:orderId` (GET)
- **Mục đích:** Check xem order đã được thanh toán chưa
- **Gọi:** Mỗi 5 giây 1 lần (polling)
- **Response:**
  ```json
  {
    "orderId": "123",
    "paymentStatus": "COMPLETED", // hoặc PENDING
    "paidAt": "2025-10-14T10:30:00Z",
    "transactions": [...]
  }
  ```

### `/payment/sepay-webhook` (POST) - Backend only
- **Mục đích:** Nhận webhook từ SePay
- **Gọi bởi:** SePay server (không phải frontend)
- **Payload:**
  ```json
  {
    "id": 123456,
    "gateway": "BIDV",
    "amount_in": 100000,
    "transaction_content": "ORDER123 thanh toan don hang",
    ...
  }
  ```

---

## 🔑 Key Points:

1. ✅ **Load payment info 1 lần** → Hiệu quả, không lãng phí
2. ✅ **Polling chỉ check status** → Nhẹ, đơn giản
3. ✅ **QR hiển thị ngay** → SePay QR API hoạt động
4. ✅ **Webhook tự động update** → Realtime
5. ✅ **Frontend polling phát hiện** → User experience tốt

---

**Tóm lại:** Flow bây giờ sạch sẽ, đúng logic, không còn request spam nữa! 🚀
