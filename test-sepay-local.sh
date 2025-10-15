#!/bin/bash

# ============================================
# Script Test SePay Payment Local
# ============================================
# Mô phỏng webhook từ SePay khi khách hàng thanh toán
# qua VA (Virtual Account) hoặc chuyển khoản thường
# ============================================

echo "🧪 Testing SePay Payment Webhook (Local)"
echo "=========================================="
echo ""

# Check if order number is provided
if [ -z "$1" ]; then
  echo "❌ Error: Vui lòng cung cấp mã đơn hàng"
  echo ""
  echo "Cách dùng:"
  echo "  ./test-sepay-local.sh ORD-20251013-001"
  echo "  ./test-sepay-local.sh ORD-20251013-001 500000"
  echo ""
  exit 1
fi

ORDER_NUMBER=$1
AMOUNT=${2:-100000}  # Default 100,000 VND if not specified

echo "📦 Mã đơn hàng: $ORDER_NUMBER"
echo "💰 Số tiền: $AMOUNT VND"
echo ""

# Generate random transaction ID
RANDOM_ID=$((RANDOM % 1000000))

# Simulate SePay webhook data
WEBHOOK_DATA=$(cat <<EOF
{
  "id": $RANDOM_ID,
  "gateway": "BIDV",
  "transaction_date": "$(date '+%Y-%m-%d %H:%M:%S')",
  "account_number": "96247LAI712004",
  "sub_account": "",
  "amount_in": $AMOUNT,
  "amount_out": 0,
  "accumulated": 5000000,
  "code": "FT$RANDOM_ID",
  "transaction_content": "$ORDER_NUMBER thanh toan don hang",
  "reference_number": "FT$RANDOM_ID",
  "body": ""
}
EOF
)

echo "📤 Gửi webhook đến backend..."
echo "URL: http://localhost:3000/api/v1/payment/sepay-webhook"
echo ""

# Send webhook request
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_DATA")

echo "📥 Phản hồi từ backend:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "success.*true"; then
  echo "✅ Webhook xử lý thành công!"
  echo ""
  echo "🔍 Kiểm tra:"
  echo "  - Vào trang Payment: http://localhost:5173/payment/<orderId>"
  echo "  - Kiểm tra database: SELECT * FROM orders WHERE orderNumber = '$ORDER_NUMBER'"
  echo "  - Kiểm tra logs backend"
else
  echo "❌ Webhook thất bại!"
  echo ""
  echo "Có thể do:"
  echo "  - Mã đơn hàng không tồn tại"
  echo "  - Đơn hàng đã thanh toán rồi"
  echo "  - Backend không chạy"
  echo "  - Số tiền không khớp"
fi

echo ""
echo "=========================================="
echo "💡 Tips:"
echo "  - Để test với số tiền khác: ./test-sepay-local.sh $ORDER_NUMBER 500000"
echo "  - Backend phải chạy ở port 3000"
echo "  - Frontend phải chạy ở port 5173"
echo "=========================================="

