# Resend Setup Guide (ĐƠN GIẢN NHẤT!)

## 🎯 Tại sao dùng Resend?

✅ **Cực kỳ đơn giản** - Chỉ cần 1 API key
✅ **Không cần verify email** - Test ngay với `onboarding@resend.dev`
✅ **Free 100 emails/day** - Đủ cho MLM system nhỏ/vừa
✅ **Hoạt động trên Railway** - Không bị block như SMTP
✅ **Modern dashboard** - Tracking emails đẹp

## 📝 Setup chỉ 3 bước (2 phút!)

### **Bước 1: Đăng ký Resend FREE**

1. Truy cập: **https://resend.com/signup**
2. Đăng ký với email (hoặc login Google)
3. Xác nhận email
4. **XONG!** 🎉

### **Bước 2: Lấy API Key**

1. Sau khi login, vào: **https://resend.com/api-keys**
2. Click **Create API Key**
3. Đặt tên: `Railway Production`
4. Permissions: **Full Access** (hoặc chỉ **Sending access**)
5. Click **Create**
6. **Copy API key** (format: `re_xxxxxxxxxxxx`)

⚠️ **QUAN TRỌNG:** Copy ngay vì chỉ hiện 1 lần!

### **Bước 3: Add vào Railway**

1. Vào Railway: **https://railway.app/**
2. Chọn backend project
3. Tab **Variables**
4. Add 2 variables:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=LD Group <onboarding@resend.dev>
```

5. Railway sẽ **TỰ ĐỘNG REDEPLOY**

**XONG!** ✅ Email service đã sẵn sàng!

---

## 📧 Email nào được gửi?

**Hiện tại: TẤT CẢ ĐỀU TẮT** (theo yêu cầu user)

Emails bị disable:
- ❌ Password reset
- ❌ Order created
- ❌ Order confirmed
- ❌ Commission earned
- ❌ Withdrawal approved/completed

**Lý do:** User muốn làm đơn giản, không cần email notification.

Workflow hiện tại:
- **Password reset:** User liên hệ admin → Admin check logs → Admin reset password trong panel
- **Orders/Commission:** User check trong dashboard

---

## 🚀 Nếu muốn BẬT lại email (sau này)

Chỉ cần bật lại trong code, email service đã sẵn sàng với Resend!

**Ví dụ bật lại password reset email:**

```typescript
// File: email.service.ts
async sendPasswordResetEmail(...) {
  return this.sendEmail({
    to,
    subject: 'Yêu cầu đặt lại mật khẩu - LD Group',
    template: 'reset-password',
    context: { username, resetUrl, expiryHours: 1 },
  });
}
```

**Ví dụ bật lại order created email:**

```typescript
// File: email.service.ts
async sendOrderCreatedEmail(...) {
  return this.sendEmail({
    to,
    subject: `Đơn hàng ${orderData.orderNumber} đã được tạo`,
    template: 'order-created',
    context: orderData,
  });
}
```

---

## 🔧 Testing Email (Local)

```bash
# Set environment variable
export RESEND_API_KEY=re_xxxxxxxxxxxx
export EMAIL_FROM="LD Group <onboarding@resend.dev>"

# Run backend
npm run start:dev
```

Test bằng cách:
1. Bật lại 1 email method (xóa dòng `return true`)
2. Trigger email (ví dụ: forgot password)
3. Check email inbox hoặc Resend dashboard

---

## 🌐 Production: Verify Domain (OPTIONAL)

Để gửi email từ domain riêng (vd: `support@ldgroup.vn`):

1. Vào Resend: **https://resend.com/domains**
2. Click **Add Domain**
3. Nhập domain: `ldgroup.vn`
4. Add DNS records vào domain provider:
   - SPF record
   - DKIM records (2 records)
5. Click **Verify**
6. Update Railway variable:
   ```
   EMAIL_FROM=LD Group <support@ldgroup.vn>
   ```

**Nhưng không bắt buộc!** `onboarding@resend.dev` hoạt động tốt cho testing và production nhỏ.

---

## 📊 Resend Free Tier

- **100 emails/day** (3,000/month)
- **Unlimited** domains
- **Email API** với SDK
- **Dashboard** tracking
- **Webhooks** (nâng cao)

Nếu cần nhiều hơn:
- **Pro Plan:** $20/month - 50,000 emails/month

---

## 💡 So sánh với SendGrid/SMTP

| Feature | Resend | SendGrid | Gmail SMTP |
|---------|--------|----------|------------|
| Setup | 2 phút | 10 phút | 5 phút |
| Verify | Không cần (test) | BẮT BUỘC | BẮT BUỘC |
| Railway | ✅ Hoạt động | ✅ Hoạt động | ❌ Bị block |
| Free tier | 100/day | 100/day | 500/day |
| Code | Siêu đơn giản | Phức tạp | Rất phức tạp |
| Dashboard | ✅ Đẹp | ✅ OK | ❌ Không có |

**→ Resend là lựa chọn tốt nhất!** 🏆

---

## 🔍 Check Logs

Sau khi setup xong, check Railway logs:

```bash
railway logs
```

**Tìm dòng:**
```
📧 Email service initialized with Resend
```

Nếu thấy → **Setup thành công!** ✅

Nếu thấy:
```
⚠️ RESEND_API_KEY not found. Email service disabled.
```

→ Chưa add API key vào Railway, quay lại Bước 3.

---

## ❓ Troubleshooting

### Email không gửi được

1. Check Railway logs có `📧 Email service initialized with Resend`?
2. API key đúng chưa? (format: `re_xxxxxxxxxxxx`)
3. Check Resend dashboard: https://resend.com/emails
4. Check quota: https://resend.com/overview (còn trong 100 emails/day?)

### Lỗi "API key is invalid"

→ API key sai hoặc bị revoke. Tạo API key mới.

### Lỗi "Domain not verified"

→ Đang dùng email từ domain chưa verify. Đổi sang `onboarding@resend.dev`.

---

## 📞 Support

- **Resend Docs:** https://resend.com/docs
- **Resend Discord:** https://resend.com/discord
- **Railway Docs:** https://docs.railway.app/

---

## ✅ Checklist

- [ ] Đăng ký Resend account
- [ ] Tạo API key
- [ ] Copy API key (format: `re_xxx`)
- [ ] Add `RESEND_API_KEY` vào Railway
- [ ] Add `EMAIL_FROM` vào Railway
- [ ] Chờ Railway redeploy (1-2 phút)
- [ ] Check logs thấy "Resend initialized"
- [ ] (Optional) Verify domain nếu muốn dùng email riêng

**Setup xong rồi!** 🎉 Email service sẵn sàng khi bạn cần bật lại.
