#!/bin/bash

# Test API directly without token
echo "🧪 Testing API /admin/users/search..."
echo ""

# Try to get token from localStorage (you'll need to replace this)
echo "❗ Please provide your admin token"
echo "To get token:"
echo "1. Open browser DevTools (F12)"
echo "2. Go to Console tab"
echo "3. Run: localStorage.getItem('ldgroup_admin_auth')"
echo "4. Copy the accessToken value"
echo ""

# For now, let's just test the endpoint structure
curl -s "http://localhost:3000/api/v1/admin/users/search?page=1&pageSize=5" \
  -H "Content-Type: application/json" | jq '.'
