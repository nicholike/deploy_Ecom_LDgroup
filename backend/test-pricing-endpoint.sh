#!/bin/bash

# Test script for pricing endpoint
set -e

API_URL="http://localhost:3000/api/v1"

echo "🔐 Step 1: Login as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"admin","password":"Admin@123456"}')

echo "Response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get access token"
  echo "Response was: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got access token: ${TOKEN:0:20}..."

echo ""
echo "📋 Step 2: Get current pricing..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/admin/settings/pricing/global" \
  -H "Authorization: Bearer $TOKEN")

echo "Current pricing: $GET_RESPONSE"

echo ""
echo "💾 Step 3: Update pricing..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/admin/settings/pricing/global" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "5ml": {"tier100": 99000, "tier10": 109000, "single": 139000},
    "20ml": {"tier100": 330000, "tier10": 360000, "single": 450000}
  }')

echo "Update response: $UPDATE_RESPONSE"

if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
  echo ""
  echo "✅ ✅ ✅ SUCCESS! Pricing updated successfully!"
else
  echo ""
  echo "❌ ❌ ❌ FAILED! Update did not succeed"
  echo "Full response: $UPDATE_RESPONSE"
  exit 1
fi

echo ""
echo "🔍 Step 4: Verify pricing was saved..."
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/admin/settings/pricing/global" \
  -H "Authorization: Bearer $TOKEN")

echo "Verified pricing: $VERIFY_RESPONSE"

if echo "$VERIFY_RESPONSE" | grep -q '"tier100":99000'; then
  echo ""
  echo "✅ Pricing correctly saved and retrieved!"
else
  echo ""
  echo "⚠️  Warning: Pricing may not have been saved correctly"
fi
