# 🔗 Hướng dẫn Setup Webhook SePay với Ngrok (Test Local)

## 📋 Tóm tắt

Để test webhook SePay ở local, bạn cần expose localhost ra internet bằng **ngrok**. SePay sẽ gọi webhook đến ngrok URL, ngrok sẽ forward request đến localhost.

---

## 🎯 Yêu cầu

- ✅ Backend đang chạy ở `http://localhost:3000`
- ✅ Tài khoản ngrok (miễn phí tại https://ngrok.com)
- ✅ Tài khoản SePay đã đăng nhập

---

## 🚀 Bước 1: Cài đặt Ngrok

### Linux/Mac:
```bash
# Download ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Hoặc dùng snap
sudo snap install ngrok
```

### Windows:
```powershell
# Dùng chocolatey
choco install ngrok

# Hoặc download từ https://ngrok.com/download
```

### Đăng nhập ngrok:
```bash
ngrok authtoken YOUR_NGROK_AUTH_TOKEN
```
> Lấy token tại: https://dashboard.ngrok.com/get-started/your-authtoken

---

## 🏃 Bước 2: Chạy Backend và Ngrok

### Terminal 1: Chạy Backend
```bash
cd backend
npm run start:dev
```

Backend sẽ chạy ở `http://localhost:3000`

### Terminal 2: Chạy Ngrok
```bash
ngrok http 3000
```

Bạn sẽ thấy output như sau:
```
ngrok

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abcd1234.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Lưu lại URL**: `https://abcd1234.ngrok.io` (URL của bạn sẽ khác)

---

## 🔧 Bước 3: Cấu hình Webhook trên SePay Dashboard

### 3.1. Truy cập SePay Dashboard
1. Đăng nhập vào: https://my.sepay.vn
2. Vào menu **Cài đặt** > **Webhooks** (hoặc **Developers** > **Webhooks**)

### 3.2. Tạo Webhook mới
Click **Tạo webhook mới** hoặc **Add webhook**

### 3.3. Điền thông tin:

**Webhook URL:**
```
https://abcd1234.ngrok.io/api/v1/payment/sepay-webhook
```
> ⚠️ Thay `abcd1234` bằng ngrok URL của bạn

**Webhook Name:** (tùy chọn)
```
Local Development Webhook
```

**Webhook Secret:** (nếu có yêu cầu)
```
b051b138f1e5ea67fbb72a2ce90c730d64e0b2e54b8ee641a72105f3e32f8fc2
```

**API Key:** (nếu có yêu cầu)
```
Hk+Ab7BLFPP0bOuzCsf18hVIHVlL/Ee12BMEDVEHt4s=
```

**Events to subscribe:** (chọn các sự kiện)
- ✅ Transaction Created
- ✅ Payment Received
- ✅ All Events

### 3.4. Lưu webhook
Click **Save** hoặc **Tạo webhook**

---

## 🧪 Bước 4: Test Webhook

### Option 1: Test bằng SePay Dashboard (nếu có tính năng Test)
1. Trong webhook settings, tìm nút **Test webhook** hoặc **Send test event**
2. Click để gửi test event
3. Kiểm tra logs trong terminal backend

### Option 2: Test bằng giao dịch thật (ít tiền)
1. Mở frontend: http://localhost:5173
2. Đặt một đơn hàng test (số tiền nhỏ, VD: 10,000 VND)
3. Quét QR code và chuyển tiền thật vào TK BIDV `6201235752`
4. Nhập nội dung chuyển khoản: `ORD-20251013-001` (mã đơn hàng của bạn)
5. Sau khi chuyển khoản, SePay sẽ phát hiện và gửi webhook

### Option 3: Test bằng script giả lập (không tốn tiền)
```bash
# Giả lập webhook từ SePay
./test-sepay-local.sh ORD-20251013-001 100000
```

---

## 📊 Bước 5: Kiểm tra kết quả

### Backend Logs (Terminal 1)
Bạn sẽ thấy:
```
📥 Received SePay webhook: {
  "id": 123456,
  "gateway": "BIDV",
  "transaction_date": "2025-10-14 10:30:00",
  "account_number": "6201235752",
  "amount_in": 100000,
  "transaction_content": "ORD-20251013-001 thanh toan don hang",
  ...
}
📋 Request headers: {
  "content-type": "application/json",
  "user-agent": "SePay/1.0",
  ...
}
Bank transaction created: abc-123-def
✅ Order ORD-20251013-001 payment confirmed
```

### Ngrok Web Interface
Mở http://127.0.0.1:4040 để xem:
- Request/Response details
- Headers
- Body
- Timing

### Frontend
- Trang payment tự động cập nhật thành "Thanh toán thành công!"
- Redirect về trang account sau 5 giây

### Database
```sql
-- Kiểm tra giao dịch
SELECT * FROM bank_transactions ORDER BY created_at DESC LIMIT 1;

-- Kiểm tra đơn hàng
SELECT orderNumber, status, paymentStatus, paidAt
FROM orders
WHERE orderNumber = 'ORD-20251013-001';
```

---

## 🔍 Troubleshooting

### ❌ Webhook không được gọi
1. **Kiểm tra ngrok đang chạy**:
   ```bash
   curl https://abcd1234.ngrok.io/api/v1/payment/sepay-webhook
   ```
   Phải trả về response từ backend

2. **Kiểm tra URL trong SePay Dashboard**:
   - Phải có `/api/v1/payment/sepay-webhook`
   - Không có typo
   - Protocol là HTTPS (ngrok tự động)

3. **Kiểm tra ngrok free tier limits**:
   - Free tier có giới hạn 40 requests/phút
   - Session timeout sau 8 giờ (phải restart ngrok)

### ❌ Webhook được gọi nhưng lỗi
1. **Kiểm tra backend logs** để xem lỗi gì
2. **Kiểm tra format dữ liệu** từ SePay có đúng không
3. **Kiểm tra ngrok web interface** (http://127.0.0.1:4040) để xem request/response

### ❌ Order không được cập nhật
1. **Kiểm tra nội dung chuyển khoản** có mã đơn hàng không
2. **Kiểm tra số tiền** có khớp với order không (±1%)
3. **Kiểm tra order status** phải là `PENDING`, `paymentStatus` phải là `PENDING`

---

## 📝 Notes

### Ngrok URL thay đổi mỗi lần restart
- Free tier của ngrok sẽ tạo random URL mỗi lần chạy
- Phải cập nhật lại webhook URL trên SePay mỗi lần restart ngrok
- **Giải pháp**: Nâng cấp ngrok lên paid plan để có static domain

### Alternative to Ngrok
Nếu không muốn dùng ngrok, có thể dùng:
- **Cloudflare Tunnel** (miễn phí, không giới hạn)
- **localtunnel** (miễn phí)
- **serveo** (miễn phí)

### Ví dụ với Cloudflare Tunnel:
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Run tunnel
cloudflared tunnel --url http://localhost:3000
```

---

## 🚀 Deploy Production

Khi deploy lên production, bạn **KHÔNG CẦN** ngrok nữa:

1. Deploy backend lên server (VPS, Heroku, Railway, etc.)
2. Có domain với HTTPS (VD: `https://api.laistore.online`)
3. Update webhook URL trên SePay:
   ```
   https://api.laistore.online/api/v1/payment/sepay-webhook
   ```
4. Webhook sẽ hoạt động tự động

---

## ✅ Checklist

Trước khi test, đảm bảo:

- [ ] Backend đang chạy ở port 3000
- [ ] Ngrok đang chạy và có URL
- [ ] Đã cấu hình webhook trên SePay với ngrok URL
- [ ] Đã có đơn hàng test với mã rõ ràng
- [ ] Frontend đang chạy ở port 5173

---

## 📞 Support

Nếu gặp vấn đề:
1. Check backend logs
2. Check ngrok web interface (http://127.0.0.1:4040)
3. Check SePay dashboard webhook logs
4. Contact SePay support: info@sepay.vn

---

**Happy Testing!** 🎉
