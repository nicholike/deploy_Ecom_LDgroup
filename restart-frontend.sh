#!/bin/bash

echo "🔄 Stopping frontend dev server..."

# Kill existing vite processes
pkill -f "vite" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

sleep 2

echo "✅ Stopped"
echo ""
echo "📝 To restart frontend, run:"
echo "   cd /home/dieplai/Ecomerce_LDGroup/frontend"
echo "   npm run dev"
echo ""
echo "Then open browser and go to the URL shown by Vite"
