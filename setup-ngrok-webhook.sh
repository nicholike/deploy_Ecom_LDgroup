#!/bin/bash

# ============================================
# Script Setup Ngrok & Test SePay Webhook
# ============================================
# Script này giúp bạn setup ngrok và test webhook SePay local
# ============================================

set -e

echo "🚀 SETUP NGROK & SEPAY WEBHOOK"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo "📋 Step 1: Kiểm tra Backend..."
if curl -s http://localhost:3000/api/v1 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend đang chạy ở http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Backend chưa chạy!${NC}"
    echo ""
    echo "Vui lòng chạy backend trước:"
    echo "  cd backend"
    echo "  npm run start:dev"
    echo ""
    exit 1
fi

# Check if ngrok is installed
echo ""
echo "📋 Step 2: Kiểm tra Ngrok..."
if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}✅ Ngrok đã được cài đặt${NC}"
else
    echo -e "${YELLOW}⚠️  Ngrok chưa được cài đặt${NC}"
    echo ""
    echo "Cài đặt ngrok:"
    echo "  1. Truy cập: https://ngrok.com/download"
    echo "  2. Download và cài đặt"
    echo "  3. Chạy: ngrok authtoken YOUR_TOKEN"
    echo "  4. Chạy lại script này"
    echo ""
    exit 1
fi

# Check if ngrok is authenticated
echo ""
echo "📋 Step 3: Kiểm tra Ngrok authentication..."
if [ -f ~/.ngrok2/ngrok.yml ] || [ -f ~/Library/Application\ Support/ngrok/ngrok.yml ]; then
    echo -e "${GREEN}✅ Ngrok đã được authenticate${NC}"
else
    echo -e "${YELLOW}⚠️  Ngrok chưa được authenticate${NC}"
    echo ""
    echo "Authenticate ngrok:"
    echo "  1. Lấy authtoken tại: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "  2. Chạy: ngrok authtoken YOUR_TOKEN"
    echo ""
    exit 1
fi

# Start ngrok
echo ""
echo "🚀 Step 4: Khởi động Ngrok tunnel..."
echo ""

# Kill existing ngrok processes
pkill -f ngrok || true

# Start ngrok in background
ngrok http 3000 > /dev/null &
NGROK_PID=$!

echo -e "${BLUE}⏳ Đang khởi động ngrok...${NC}"
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}❌ Không thể lấy ngrok URL!${NC}"
    echo ""
    echo "Vui lòng:"
    echo "  1. Kiểm tra ngrok đã chạy: ps aux | grep ngrok"
    echo "  2. Chạy thủ công: ngrok http 3000"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Ngrok đang chạy!${NC}"
echo ""
echo "=========================================="
echo -e "${GREEN}📍 NGROK URL:${NC}"
echo -e "${BLUE}$NGROK_URL${NC}"
echo "=========================================="
echo ""

# Show webhook URL
WEBHOOK_URL="$NGROK_URL/api/v1/payment/sepay-webhook"
echo -e "${GREEN}🔗 WEBHOOK URL (dùng để cấu hình trên SePay):${NC}"
echo -e "${BLUE}$WEBHOOK_URL${NC}"
echo ""

# Copy to clipboard (if available)
if command -v xclip &> /dev/null; then
    echo "$WEBHOOK_URL" | xclip -selection clipboard
    echo -e "${GREEN}✅ Đã copy webhook URL vào clipboard!${NC}"
    echo ""
elif command -v pbcopy &> /dev/null; then
    echo "$WEBHOOK_URL" | pbcopy
    echo -e "${GREEN}✅ Đã copy webhook URL vào clipboard!${NC}"
    echo ""
fi

# Show API Keys
echo "=========================================="
echo -e "${GREEN}🔑 API KEYS (dùng khi cấu hình webhook trên SePay):${NC}"
echo ""
echo "API Key:"
echo -e "${YELLOW}Hk+Ab7BLFPP0bOuzCsf18hVIHVlL/Ee12BMEDVEHt4s=${NC}"
echo ""
echo "Webhook Secret:"
echo -e "${YELLOW}b051b138f1e5ea67fbb72a2ce90c730d64e0b2e54b8ee641a72105f3e32f8fc2${NC}"
echo "=========================================="
echo ""

# Instructions
echo -e "${GREEN}📋 HƯỚNG DẪN SETUP WEBHOOK TRÊN SEPAY:${NC}"
echo ""
echo "1. Truy cập: https://my.sepay.vn"
echo "2. Vào: Cài đặt > Webhooks"
echo "3. Click: Tạo webhook mới"
echo "4. Điền thông tin:"
echo -e "   - Webhook URL: ${BLUE}$WEBHOOK_URL${NC}"
echo "   - API Key (nếu có): Hk+Ab7BLFPP0bOuzCsf18hVIHVlL/Ee12BMEDVEHt4s="
echo "   - Secret (nếu có): b051b138f1e5ea67fbb72a2ce90c730d64e0b2e54b8ee641a72105f3e32f8fc2"
echo "5. Chọn Events: All Events hoặc Transaction Created"
echo "6. Click: Save"
echo ""

echo -e "${GREEN}🧪 TEST WEBHOOK:${NC}"
echo ""
echo "Option 1: Test bằng script (giả lập, không cần tiền thật)"
echo -e "   ${BLUE}./test-sepay-local.sh ORD-20251013-001 100000${NC}"
echo ""
echo "Option 2: Test bằng SePay Dashboard"
echo "   - Trong webhook settings, click 'Test webhook'"
echo ""
echo "Option 3: Test bằng giao dịch thật (ít tiền)"
echo "   - Đặt đơn hàng trên frontend: http://localhost:5173"
echo "   - Chuyển tiền vào TK: 6201235752 - BIDV"
echo "   - Nội dung: Mã đơn hàng (VD: ORD-20251013-001)"
echo ""

echo "=========================================="
echo -e "${GREEN}📊 MONITOR:${NC}"
echo ""
echo "Backend logs: Terminal bạn đang chạy npm run start:dev"
echo "Ngrok web interface: http://127.0.0.1:4040"
echo "Frontend: http://localhost:5173"
echo ""

echo "=========================================="
echo -e "${YELLOW}⚠️  LƯU Ý:${NC}"
echo "- Ngrok URL sẽ thay đổi mỗi lần restart (free tier)"
echo "- Phải cập nhật lại webhook URL trên SePay khi restart"
echo "- Ngrok free có giới hạn: 40 requests/phút, session 8 giờ"
echo ""

echo -e "${GREEN}✅ SETUP HOÀN TẤT!${NC}"
echo ""
echo "Press Ctrl+C để dừng ngrok..."
echo ""

# Keep script running
wait $NGROK_PID
