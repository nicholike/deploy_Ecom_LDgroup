#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Verifying Pricing API Response${NC}"
echo "================================================"
echo ""

# Get admin token (you'll need to replace this with a real token)
echo -e "${YELLOW}📡 Testing GET /admin/settings/pricing/global${NC}"
echo ""

# Test without auth first (should fail)
response=$(curl -s http://localhost:3000/api/v1/admin/settings/pricing/global)

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""

# Check if response contains new format
if echo "$response" | grep -q "range1to9"; then
    echo -e "${GREEN}✅ SUCCESS: API returns NEW format (range1to9, range10to49, range50to99, range100plus)${NC}"
elif echo "$response" | grep -q "tier100"; then
    echo -e "${RED}❌ ERROR: API still returns OLD format (tier100, tier10, single)${NC}"
    echo -e "${YELLOW}Please restart backend to clear cache${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️  WARNING: Unexpected response format${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Verification complete${NC}"
