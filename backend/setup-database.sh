#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MLM E-commerce Database Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Database configuration
DB_NAME="mlm_ecommerce"
DB_USER="mlm_user"
DB_PASSWORD="mlm_password_2025"
DB_HOST="localhost"
DB_PORT="3306"

echo -e "${GREEN}📋 Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Host: $DB_HOST"
echo ""

# Step 1: Create database and user
echo -e "${GREEN}Step 1: Creating database and user...${NC}"

sudo mysql -e "
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'$DB_HOST' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'$DB_HOST';
FLUSH PRIVILEGES;
" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created successfully!${NC}\n"
else
    echo -e "${RED}❌ Error creating database. Please check your MySQL installation.${NC}"
    exit 1
fi

# Step 2: Update .env file
echo -e "${GREEN}Step 2: Updating .env file...${NC}"

ENV_FILE=".env"

# Create .env from .env.example if not exists
if [ ! -f "$ENV_FILE" ]; then
    cp .env.example "$ENV_FILE"
    echo -e "${BLUE}Created .env from .env.example${NC}"
fi

# Update DATABASE_URL
DATABASE_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Check if DATABASE_URL exists in .env
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    # Replace existing DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|g" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|g" "$ENV_FILE"
    fi
else
    # Add DATABASE_URL
    echo "DATABASE_URL=\"$DATABASE_URL\"" >> "$ENV_FILE"
fi

echo -e "${GREEN}✅ .env file updated!${NC}\n"

# Step 3: Test connection
echo -e "${GREEN}Step 3: Testing connection...${NC}"

mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "SELECT 1;" 2>&1 > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection test successful!${NC}\n"
else
    echo -e "${RED}❌ Connection test failed!${NC}"
    exit 1
fi

# Step 4: Show database info
echo -e "${GREEN}Step 4: Verifying database...${NC}"

mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "
USE $DB_NAME;
SHOW TABLES;
"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}📝 Your database credentials:${NC}"
echo "  Database URL: $DATABASE_URL"
echo ""

echo -e "${BLUE}🚀 Next steps:${NC}"
echo "  1. pnpm prisma:generate"
echo "  2. pnpm prisma:migrate"
echo "  3. pnpm prisma:seed"
echo "  4. pnpm run start:dev"
echo ""

echo -e "${GREEN}Happy coding! 🎉${NC}"
