#!/bin/bash

echo "========================================"
echo "  MLM E-commerce - Complete Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Setup Database
echo -e "${BLUE}Step 1: Setting up MySQL database...${NC}"
echo "Bạn sẽ cần nhập sudo password để tạo database"
echo ""

sudo mysql << EOF
CREATE DATABASE IF NOT EXISTS mlm_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mlm_user'@'localhost' IDENTIFIED BY 'mlm_password_2025';
GRANT ALL PRIVILEGES ON mlm_ecommerce.* TO 'mlm_user'@'localhost';
FLUSH PRIVILEGES;
SELECT 'Database created successfully!' as Status;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database setup complete!${NC}"
else
    echo -e "${RED}❌ Database setup failed!${NC}"
    exit 1
fi

echo ""

# Step 2: Verify database connection
echo -e "${BLUE}Step 2: Verifying database connection...${NC}"
mysql -u mlm_user -pmlm_password_2025 -e "SHOW DATABASES;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Cannot connect to database!${NC}"
    exit 1
fi

echo ""

# Step 3: Backend setup
echo -e "${BLUE}Step 3: Setting up backend...${NC}"
cd /home/dieplai/Ecomerce_LDGroup/backend

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Generate Prisma Client
echo "Generating Prisma Client..."
pnpm prisma:generate

# Run migrations
echo "Running database migrations..."
pnpm prisma:migrate

# Seed database
echo "Seeding database..."
pnpm prisma:seed

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend setup complete!${NC}"
else
    echo -e "${RED}❌ Backend setup failed!${NC}"
    exit 1
fi

echo ""

# Step 4: Verify database tables
echo -e "${BLUE}Step 4: Verifying database tables...${NC}"
mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce -e "SHOW TABLES;"

echo ""

# Step 5: Show admin credentials
echo -e "${BLUE}Step 5: Checking admin account...${NC}"
mysql -u mlm_user -pmlm_password_2025 mlm_ecommerce -e "SELECT id, email, username, role, referralCode FROM users WHERE role='ADMIN';"

echo ""
echo -e "${GREEN}========================================"
echo "  ✅ Setup Complete!"
echo "========================================${NC}"
echo ""

echo -e "${YELLOW}📝 Database Credentials:${NC}"
echo "  Host: localhost"
echo "  Database: mlm_ecommerce"
echo "  User: mlm_user"
echo "  Password: mlm_password_2025"
echo ""

echo -e "${YELLOW}👤 Admin Account:${NC}"
echo "  Email: admin@mlm.com"
echo "  Password: Admin@123456"
echo ""

echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "  1. cd /home/dieplai/Ecomerce_LDGroup/backend"
echo "  2. pnpm run start:dev"
echo "  3. Open http://localhost:3000/api/docs"
echo "  4. Open frontend-test/index.html để test API"
echo ""

echo -e "${GREEN}Happy Coding! 🎉${NC}"

