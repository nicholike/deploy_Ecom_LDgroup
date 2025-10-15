#!/bin/bash

# Script to test payment webhook locally

echo "🧪 Testing Payment Webhook"
echo "=========================="
echo ""

# Check if order code is provided
if [ -z "$1" ]; then
  echo "❌ Error: Please provide order code"
  echo ""
  echo "Usage:"
  echo "  ./test-payment.sh ORD-20251013-001"
  echo ""
  exit 1
fi

ORDER_CODE=$1

echo "📦 Order Code: $ORDER_CODE"
echo ""

# Send test webhook
echo "🚀 Sending test webhook to backend..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/payment/test-webhook \
  -H "Content-Type: application/json" \
  -d "{\"orderCode\": \"$ORDER_CODE\"}")

echo ""
echo "📥 Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "success.*true"; then
  echo "✅ Payment webhook processed successfully!"
  echo ""
  echo "🔍 Check your Payment page - it should show 'Thanh toán thành công!'"
else
  echo "❌ Payment webhook failed!"
  echo ""
  echo "Possible issues:"
  echo "  - Order code not found"
  echo "  - Order already paid"
  echo "  - Backend not running"
fi

echo ""

