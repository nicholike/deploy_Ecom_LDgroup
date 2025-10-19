#!/bin/bash

# Test API endpoint to see if sponsor role is returned correctly
echo "🧪 Testing /admin/users/search API..."
echo ""

# Get admin token from Railway env
export $(cat backend/.env.railway.example | grep -v '^#' | xargs)

# Call API
curl -s "http://localhost:3001/api/admin/users/search?search=dieplaif4&pageSize=5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  | jq '.data.users[] | {username, role, sponsor: {username: .sponsor.username, role: .sponsor.role}}'

echo ""
echo "✅ Check if sponsor.role is F2 (not F1)"
