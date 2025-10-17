#!/bin/bash

# =============================================================================
# 🚂 Railway Auto-Deployment Script for MLM E-commerce Backend
# =============================================================================
# This script automates the entire Railway deployment process:
# - Checks prerequisites (Railway CLI, Git)
# - Generates secure JWT secrets
# - Creates Railway project and MySQL database
# - Configures all environment variables
# - Deploys and monitors the application
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️ ${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI not found!"
        echo ""
        echo "Install Railway CLI:"
        echo "  npm install -g @railway/cli"
        echo "  or"
        echo "  curl -fsSL https://railway.app/install.sh | sh"
        echo ""
        exit 1
    fi
    log_success "Railway CLI installed"

    # Check if logged in to Railway
    if ! railway whoami &> /dev/null; then
        log_error "Not logged in to Railway!"
        echo ""
        echo "Please login first:"
        echo "  railway login"
        echo ""
        exit 1
    fi
    log_success "Logged in to Railway as: $(railway whoami)"

    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git not found! Please install Git."
        exit 1
    fi
    log_success "Git installed"

    # Check if in git repo
    if ! git rev-parse --is-inside-work-tree &> /dev/null; then
        log_error "Not in a Git repository!"
        exit 1
    fi
    log_success "Git repository detected"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found! Please install Node.js."
        exit 1
    fi
    log_success "Node.js installed: $(node --version)"

    echo ""
}

# =============================================================================
# Step 2: Generate Secrets
# =============================================================================

generate_secrets() {
    log_info "Generating secure JWT secrets..."

    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

    log_success "JWT secrets generated"
    echo ""
}

# =============================================================================
# Step 3: Create Railway Project
# =============================================================================

create_railway_project() {
    log_info "Creating Railway project..."

    read -p "Enter project name (default: mlm-ecommerce-backend): " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-mlm-ecommerce-backend}

    # Initialize Railway project
    railway init -n "$PROJECT_NAME"

    log_success "Railway project created: $PROJECT_NAME"
    echo ""
}

# =============================================================================
# Step 4: Add MySQL Database
# =============================================================================

add_mysql_database() {
    log_info "Adding MySQL database service..."

    # Add MySQL plugin
    railway add -d mysql

    log_success "MySQL database added"
    log_info "Railway will auto-inject DATABASE_URL environment variable"
    echo ""
}

# =============================================================================
# Step 5: Configure Environment Variables
# =============================================================================

configure_environment() {
    log_info "Configuring environment variables..."

    # Read existing values from RAILWAY_DEPLOY_GUIDE.md or prompt user
    read -p "Enter SEPAY_API_KEY (from SePay dashboard): " SEPAY_API_KEY
    read -p "Enter BANK_ACCOUNT_NUMBER: " BANK_ACCOUNT_NUMBER
    read -p "Enter BANK_ACCOUNT_NAME: " BANK_ACCOUNT_NAME
    read -p "Enter BANK_CODE (e.g., BIDV): " BANK_CODE
    BANK_CODE=${BANK_CODE:-BIDV}
    read -p "Enter SEPAY_VA_NUMBER: " SEPAY_VA_NUMBER
    read -p "Enter SEPAY_VA_ACCOUNT_NAME: " SEPAY_VA_ACCOUNT_NAME

    echo ""
    log_info "Setting environment variables on Railway..."

    # Application settings
    railway variables set NODE_ENV=production
    railway variables set PORT=3000
    railway variables set API_PREFIX=/api/v1

    # JWT secrets
    railway variables set JWT_SECRET="$JWT_SECRET"
    railway variables set JWT_EXPIRES_IN=1d
    railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
    railway variables set JWT_REFRESH_EXPIRES_IN=7d

    # Security
    railway variables set BCRYPT_SALT_ROUNDS=12
    railway variables set RATE_LIMIT_TTL=60
    railway variables set RATE_LIMIT_MAX=100

    # CORS (will need to update after getting domain)
    railway variables set CORS_ORIGIN="*"

    # SePay payment
    railway variables set SEPAY_API_KEY="$SEPAY_API_KEY"
    railway variables set BANK_ACCOUNT_NUMBER="$BANK_ACCOUNT_NUMBER"
    railway variables set BANK_ACCOUNT_NAME="$BANK_ACCOUNT_NAME"
    railway variables set BANK_CODE="$BANK_CODE"
    railway variables set BANK_NAME="$BANK_CODE - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam"
    railway variables set SEPAY_VA_NUMBER="$SEPAY_VA_NUMBER"
    railway variables set SEPAY_VA_ACCOUNT_NAME="$SEPAY_VA_ACCOUNT_NAME"

    # Commission rates
    railway variables set DEFAULT_COMMISSION_RATE_F1=10
    railway variables set DEFAULT_COMMISSION_RATE_F2=4
    railway variables set DEFAULT_COMMISSION_RATE_F3=2
    railway variables set DEFAULT_COMMISSION_RATE_F4=0

    # Upload
    railway variables set UPLOAD_DIR=./uploads
    railway variables set MAX_FILE_SIZE=5242880

    log_success "Environment variables configured"
    echo ""
}

# =============================================================================
# Step 6: Commit and Push Code
# =============================================================================

prepare_code() {
    log_info "Preparing code for deployment..."

    # Check if there are uncommitted changes
    if [[ -n $(git status -s) ]]; then
        log_warning "Uncommitted changes detected"
        read -p "Commit changes now? (y/n): " COMMIT_NOW

        if [[ "$COMMIT_NOW" =~ ^[Yy]$ ]]; then
            git add .
            git commit -m "Production ready: Deploy to Railway"
            log_success "Changes committed"
        else
            log_warning "Skipping commit. Make sure to commit before deploying."
        fi
    else
        log_success "No uncommitted changes"
    fi

    # Push to remote
    log_info "Pushing to remote repository..."
    CURRENT_BRANCH=$(git branch --show-current)
    git push origin "$CURRENT_BRANCH" || log_warning "Push failed or already up to date"

    echo ""
}

# =============================================================================
# Step 7: Deploy to Railway
# =============================================================================

deploy_to_railway() {
    log_info "Deploying to Railway..."
    log_info "This may take a few minutes..."
    echo ""

    # Link and deploy
    cd backend
    railway up --detach
    cd ..

    log_success "Deployment initiated!"
    echo ""
}

# =============================================================================
# Step 8: Get Domain and Status
# =============================================================================

get_domain_and_status() {
    log_info "Retrieving deployment information..."
    echo ""

    # Wait a bit for deployment to start
    sleep 5

    # Get domain
    log_info "Generating public domain..."
    DOMAIN=$(railway domain 2>/dev/null || echo "Domain generation pending...")

    if [[ "$DOMAIN" == *"railway.app"* ]]; then
        log_success "Domain: $DOMAIN"
        BACKEND_URL="https://$DOMAIN"
    else
        log_warning "Domain not yet available. Generate it manually:"
        echo "  1. Go to Railway dashboard"
        echo "  2. Click on your service"
        echo "  3. Go to Settings → Networking → Generate Domain"
        BACKEND_URL="https://your-backend.up.railway.app"
    fi

    echo ""

    # Show status
    log_info "Deployment status:"
    railway status || log_warning "Status check failed"

    echo ""
}

# =============================================================================
# Step 9: Post-Deployment Instructions
# =============================================================================

show_next_steps() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "Railway Deployment Complete!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    echo "📋 Deployment Information:"
    echo "  Backend URL: $BACKEND_URL"
    echo "  Health Check: $BACKEND_URL/api/v1/health"
    echo "  SePay Webhook: $BACKEND_URL/api/v1/payment/sepay-webhook"
    echo ""

    echo "🔧 Next Steps:"
    echo ""
    echo "1️⃣  Verify Health Check (wait ~2 minutes for deployment):"
    echo "  curl $BACKEND_URL/api/v1/health"
    echo ""

    echo "2️⃣  View Logs:"
    echo "  railway logs"
    echo ""

    echo "3️⃣  Update CORS Origin (after deploying frontend):"
    echo "  railway variables set CORS_ORIGIN=\"https://your-frontend.vercel.app,$BACKEND_URL\""
    echo ""

    echo "4️⃣  Configure SePay Webhook:"
    echo "  - Go to: https://my.sepay.vn"
    echo "  - Settings → Webhook"
    echo "  - URL: $BACKEND_URL/api/v1/payment/sepay-webhook"
    echo "  - Method: POST"
    echo "  - Auth Header: Apikey $SEPAY_API_KEY"
    echo ""

    echo "5️⃣  Monitor Deployment:"
    echo "  - Railway Dashboard: https://railway.app/dashboard"
    echo "  - Real-time logs: railway logs --follow"
    echo ""

    echo "📚 Useful Commands:"
    echo "  railway logs          # View logs"
    echo "  railway status        # Check status"
    echo "  railway variables     # List env variables"
    echo "  railway domain        # Get domain"
    echo "  railway restart       # Restart service"
    echo ""

    log_success "Deployment automation complete! 🎉"
    echo ""
}

# =============================================================================
# Main Execution Flow
# =============================================================================

main() {
    clear
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "           🚂 Railway Auto-Deployment Script"
    echo "           MLM E-commerce Backend Deployment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    check_prerequisites
    generate_secrets
    create_railway_project
    add_mysql_database
    configure_environment
    prepare_code
    deploy_to_railway
    get_domain_and_status
    show_next_steps
}

# Run main function
main
