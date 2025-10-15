#!/bin/bash

# Deploy Preparation Script
# This script prepares your project for cPanel deployment

set -e

echo "🚀 Preparing MLM E-commerce for cPanel Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Build Backend
echo -e "${YELLOW}📦 Building Backend...${NC}"
cd backend
npm install
npm run build
npx prisma generate
echo -e "${GREEN}✅ Backend built successfully${NC}"
echo ""

# 2. Build Frontend
echo -e "${YELLOW}📦 Building Frontend...${NC}"
cd ../frontend
npm install
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# 3. Create deployment packages
echo -e "${YELLOW}📦 Creating deployment packages...${NC}"
cd ..

# Create deploy directory
mkdir -p deploy

# Backend package
echo "Packaging backend..."
cd backend
zip -r ../deploy/backend-deploy.zip \
  dist/ \
  prisma/ \
  package.json \
  package-lock.json \
  uploads/ \
  -x "node_modules/*" "*.log" "*.env"

cd ..
echo -e "${GREEN}✅ backend-deploy.zip created${NC}"

# Frontend package
echo "Packaging frontend..."
cd frontend
zip -r ../deploy/frontend-deploy.zip dist/
cd ..
echo -e "${GREEN}✅ frontend-deploy.zip created${NC}"

# 4. Create .env.example for production
echo ""
echo -e "${YELLOW}📝 Creating .env template...${NC}"
cat > deploy/.env.production.template << 'EOF'
# Database Configuration
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DATABASE_NAME"

# JWT Configuration
JWT_SECRET="CHANGE_THIS_TO_RANDOM_32_CHARS_OR_MORE"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration (your frontend domain)
CORS_ORIGIN=https://yourdomain.com

# Payment - Bank Account Information
BANK_CODE=VCB
BANK_NAME=Vietcombank
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_NAME=YOUR COMPANY NAME

# SePay Configuration
SEPAY_API_KEY=your_sepay_api_key
SEPAY_SECRET_KEY=your_sepay_secret_key
EOF

echo -e "${GREEN}✅ .env template created${NC}"

# 5. Create deployment checklist
cat > deploy/DEPLOYMENT_CHECKLIST.md << 'EOF'
# 🚀 Deployment Checklist

## Pre-deployment
- [ ] Backend built successfully
- [ ] Frontend built successfully
- [ ] .env configured with production values
- [ ] Database credentials ready
- [ ] Domain/subdomain configured

## cPanel Setup
- [ ] MySQL database created
- [ ] Database user created with privileges
- [ ] Node.js app created (v18+)
- [ ] SSL certificate installed
- [ ] Subdomain `api.yourdomain.com` created

## Backend Deployment
- [ ] backend-deploy.zip uploaded
- [ ] Files extracted to app root
- [ ] .env file created with correct values
- [ ] Dependencies installed: `npm install --production`
- [ ] Prisma generated: `npx prisma generate`
- [ ] Migrations run: `npx prisma migrate deploy`
- [ ] PM2 installed and app started
- [ ] API accessible at https://api.yourdomain.com

## Frontend Deployment
- [ ] frontend-deploy.zip uploaded
- [ ] Files extracted to public_html
- [ ] .htaccess configured
- [ ] API endpoint URL correct
- [ ] Site accessible at https://yourdomain.com

## Testing
- [ ] Backend health check: `curl https://api.yourdomain.com/api/v1/health`
- [ ] Login works
- [ ] Create order works
- [ ] Payment flow works
- [ ] SePay webhook configured
- [ ] Admin panel accessible

## Post-deployment
- [ ] Change default admin password
- [ ] Test all critical features
- [ ] Monitor logs for errors
- [ ] Setup backup schedule
- [ ] Document any issues

## Notes
- Backend logs: `pm2 logs mlm-api`
- Restart backend: `pm2 restart mlm-api`
- Frontend at: /home/username/public_html
- Backend at: /home/username/api
EOF

# 6. Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment packages ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📦 Deployment files created in ./deploy/ folder:"
echo "   - backend-deploy.zip"
echo "   - frontend-deploy.zip"
echo "   - .env.production.template"
echo "   - DEPLOYMENT_CHECKLIST.md"
echo ""
echo "📚 Next steps:"
echo "   1. Read: DEPLOY_CPANEL.md"
echo "   2. Configure .env file"
echo "   3. Upload files to cPanel"
echo "   4. Follow deployment checklist"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "   - Update .env with production database credentials"
echo "   - Change JWT_SECRET to a strong random value"
echo "   - Configure your domain/subdomain"
echo "   - Test thoroughly before going live"
echo ""
echo "🎉 Good luck with your deployment!"

