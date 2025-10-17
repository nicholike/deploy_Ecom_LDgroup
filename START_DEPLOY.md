# 🚀 Deploy Nhanh Lên Railway

## Bước 1: Đăng nhập Railway

```bash
railway login
```

## Bước 2: Chạy Script Tự Động

```bash
./deploy-railway.sh
```

## Bước 3: Nhập Thông Tin Khi Được Hỏi

Script sẽ hỏi:
- Tên project (có thể bỏ qua để dùng mặc định)
- SEPAY_API_KEY
- Số tài khoản ngân hàng
- Tên chủ tài khoản
- Mã ngân hàng (BIDV)
- Số VA (Virtual Account)
- Tên VA

## Bước 4: Chờ Deploy Xong

Script sẽ tự động:
- ✅ Tạo project trên Railway
- ✅ Thêm MySQL database
- ✅ Cấu hình tất cả biến môi trường
- ✅ Deploy backend

## Bước 5: Kiểm Tra

```bash
./verify-deployment.sh
```

## Xong! 🎉

Backend đã live tại: `https://your-app.up.railway.app`

---

**Chi tiết đầy đủ:** Xem file `DEPLOYMENT_READY.md`
