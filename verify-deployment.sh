#!/bin/bash

# =============================================================================
# 🔍 Railway Deployment Verification Script
# =============================================================================
# This script verifies that your Railway deployment is working correctly
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# Get backend URL
read -p "Enter your Railway backend URL (e.g., https://your-app.up.railway.app): " BACKEND_URL

# Remove trailing slash
BACKEND_URL=${BACKEND_URL%/}

echo ""
log_info "Verifying deployment: $BACKEND_URL"
echo ""

# =============================================================================
# Test 1: Health Check
# =============================================================================

log_info "Test 1: Health Check Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
    log_success "Health check passed (200 OK)"
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
else
    log_error "Health check failed (HTTP $HTTP_CODE)"
    echo "$RESPONSE_BODY"
fi
echo ""

# =============================================================================
# Test 2: Database Connection
# =============================================================================

log_info "Test 2: Database Connection..."
DB_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.database.status' 2>/dev/null || echo "unknown")

if [ "$DB_STATUS" == "connected" ]; then
    log_success "Database connected"
else
    log_error "Database connection failed: $DB_STATUS"
fi
echo ""

# =============================================================================
# Test 3: CORS Configuration
# =============================================================================

log_info "Test 3: CORS Configuration..."
CORS_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Origin: https://evil.com" "$BACKEND_URL/api/v1/health")
CORS_CODE=$(echo "$CORS_RESPONSE" | tail -n 1)

if [ "$CORS_CODE" == "200" ] || [ "$CORS_CODE" == "403" ]; then
    log_success "CORS is configured (blocked unauthorized origin or wildcard enabled)"
else
    log_error "CORS configuration issue (HTTP $CORS_CODE)"
fi
echo ""

# =============================================================================
# Test 4: Authentication
# =============================================================================

log_info "Test 4: Authentication Required..."
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/users")
AUTH_CODE=$(echo "$AUTH_RESPONSE" | tail -n 1)

if [ "$AUTH_CODE" == "401" ]; then
    log_success "Authentication is enforced (401 Unauthorized)"
else
    log_error "Authentication not properly enforced (HTTP $AUTH_CODE)"
fi
echo ""

# =============================================================================
# Test 5: SePay Webhook Security
# =============================================================================

log_info "Test 5: SePay Webhook Security..."
WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/payment/sepay-webhook" \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}')
WEBHOOK_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n 1)
WEBHOOK_BODY=$(echo "$WEBHOOK_RESPONSE" | head -n -1)

if [ "$WEBHOOK_CODE" == "401" ] || [ "$WEBHOOK_CODE" == "403" ]; then
    log_success "SePay webhook is protected (requires API key)"
else
    log_error "SePay webhook security issue (HTTP $WEBHOOK_CODE)"
    echo "$WEBHOOK_BODY"
fi
echo ""

# =============================================================================
# Test 6: Ready Check
# =============================================================================

log_info "Test 6: Readiness Check..."
READY_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/health/ready")
READY_CODE=$(echo "$READY_RESPONSE" | tail -n 1)

if [ "$READY_CODE" == "200" ]; then
    log_success "Application is ready"
else
    log_error "Application not ready (HTTP $READY_CODE)"
fi
echo ""

# =============================================================================
# Summary
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    🔍 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$HTTP_CODE" == "200" ] && [ "$DB_STATUS" == "connected" ] && [ "$AUTH_CODE" == "401" ] && [ "$WEBHOOK_CODE" == "401" ] || [ "$WEBHOOK_CODE" == "403" ]; then
    log_success "All critical checks passed! ✅"
    echo ""
    echo "Your backend is deployed correctly and ready for production."
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Update CORS_ORIGIN with your frontend domain"
    echo "  2. Configure SePay webhook in SePay dashboard"
    echo "  3. Test payment flow end-to-end"
    echo "  4. Monitor logs: railway logs --follow"
else
    log_error "Some checks failed. Please review the errors above."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  - View logs: railway logs"
    echo "  - Check env variables: railway variables"
    echo "  - Restart service: railway restart"
    echo "  - See RAILWAY_DEPLOY_GUIDE.md for detailed troubleshooting"
fi

echo ""
