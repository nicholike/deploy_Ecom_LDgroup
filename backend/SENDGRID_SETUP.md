# SendGrid Setup Guide

## 📧 Cấu hình SendGrid cho Railway

### Bước 1: Đăng ký SendGrid (FREE)

1. Truy cập: https://signup.sendgrid.com/
2. Điền thông tin:
   - Email: `dieptrungnam123@gmail.com` (hoặc email công ty)
   - Password: Tạo password mới
   - Company Name: `LD Group`
3. Verify email của bạn

### Bước 2: Tạo API Key

1. Đăng nhập vào SendGrid Dashboard: https://app.sendgrid.com/
2. Vào **Settings** → **API Keys**
3. Click **Create API Key**
4. Cấu hình:
   - API Key Name: `Railway Production`
   - API Key Permissions: Chọn **Full Access**
5. Click **Create & View**
6. **QUAN TRỌNG:** Copy API key ngay (chỉ hiện 1 lần!)
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Bước 3: Verify Sender Email

SendGrid yêu cầu verify email người gửi để ngăn spam.

**Option 1: Single Sender Verification (NHANH - Khuyến nghị)**
1. Vào **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Điền thông tin:
   - From Name: `LD Group`
   - From Email: `support@ldgroup.vn` (hoặc email thật của bạn)
   - Reply To: (same as From Email)
   - Company Address: Địa chỉ công ty
4. Click **Create**
5. Check email và click link verification

**Option 2: Domain Authentication (CHUYÊN NGHIỆP - Cần access DNS)**
1. Vào **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Làm theo hướng dẫn add DNS records vào domain của bạn

### Bước 4: Thêm API Key vào Railway

1. Vào Railway Dashboard: https://railway.app/
2. Chọn project backend của bạn
3. Vào tab **Variables**
4. Add new variable:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Đảm bảo `SMTP_FROM` khớp với verified sender email:
   ```
   SMTP_FROM="LD Group" <support@ldgroup.vn>
   ```
6. Railway sẽ tự động redeploy

### Bước 5: Kiểm tra Logs

Sau khi Railway redeploy xong (1-2 phút):

```bash
railway logs
```

Tìm dòng:
```
📧 Email service initialized with SendGrid
```

Nếu thấy dòng này → **Setup thành công!** ✅

### Bước 6: Test Email

1. Vào frontend, thử chức năng **Forgot Password**
2. Nhập email của bạn
3. Check email inbox (có thể trong spam folder)
4. Kiểm tra Railway logs xem có lỗi không

## 🎯 Emails sẽ được gửi

**Theo yêu cầu, hệ thống CHỈ gửi 2 loại email:**

1. ✅ **Đơn hàng được đặt thành công** (`sendOrderCreatedEmail`)
   - Trigger: Khi user tạo đơn hàng mới
   - Template: `order-created.hbs`

2. ✅ **Reset mật khẩu** (`sendPasswordResetEmail`)
   - Trigger: Khi user request đổi mật khẩu
   - Template: `reset-password.hbs`

**Emails đã TẮT:**

- ❌ Order confirmed (payment notification)
- ❌ Commission earned
- ❌ Withdrawal approved
- ❌ Withdrawal completed

## 📊 SendGrid Free Tier

- **100 emails/day** (3,000 emails/month)
- Unlimited contacts
- Email API + SMTP
- Email validation
- Deliverability insights

Nếu cần nhiều hơn 100 emails/day, upgrade:
- **Essentials Plan:** $19.95/month - 50,000 emails/month

## 🔧 Troubleshooting

### Lỗi: "The from address does not match a verified Sender Identity"

**Nguyên nhân:** Email trong `SMTP_FROM` chưa được verify

**Giải pháp:**
1. Vào **Sender Authentication** trong SendGrid
2. Verify email `support@ldgroup.vn`
3. Hoặc đổi `SMTP_FROM` thành email đã verify

### Lỗi: "Unauthorized"

**Nguyên nhân:** API key sai hoặc bị revoke

**Giải pháp:**
1. Tạo API key mới
2. Update `SENDGRID_API_KEY` trong Railway

### Email không gửi được

**Kiểm tra:**
1. Railway logs có hiện `📧 Email service initialized with SendGrid`?
2. SendGrid API key đã add đúng?
3. Sender email đã verify chưa?
4. Check SendGrid Activity Feed: https://app.sendgrid.com/email_activity

## 📞 Support

- SendGrid Docs: https://docs.sendgrid.com/
- SendGrid Support: https://support.sendgrid.com/
- Railway Docs: https://docs.railway.app/

## ✅ Checklist Setup

- [ ] Đăng ký SendGrid account
- [ ] Tạo API key với Full Access
- [ ] Copy API key (chỉ hiện 1 lần!)
- [ ] Verify sender email `support@ldgroup.vn`
- [ ] Add `SENDGRID_API_KEY` vào Railway
- [ ] Đảm bảo `SMTP_FROM` khớp với verified email
- [ ] Chờ Railway redeploy (1-2 phút)
- [ ] Kiểm tra logs thấy "SendGrid initialized"
- [ ] Test gửi email forgot password
- [ ] Test gửi email order created
