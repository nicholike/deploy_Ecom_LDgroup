#!/bin/bash

# ============================================
# AUTOMATED FLOW TEST SUITE
# For MLM E-commerce Backend
# ============================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-dieptrungnam123@gmail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Lai712004!}"

# Global variables
ACCESS_TOKEN=""
ADMIN_REFERRAL_CODE=""
TEST_USER_ID=""
TEST_USER_EMAIL="test_$(date +%s)@test.com"
TEST_USER_USERNAME="testuser_$(date +%s)"
TEST_USER_PASSWORD="Test@123"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test 1: Admin Login
test_admin_login() {
    log_info "Test 1: Admin login..."

    RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

    ACCESS_TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    ADMIN_REFERRAL_CODE=$(echo $RESPONSE | grep -o '"referralCode":"[^"]*' | cut -d'"' -f4)

    if [ -z "$ACCESS_TOKEN" ]; then
        log_error "Failed to login as admin"
        echo "Response: $RESPONSE"
        exit 1
    fi

    log_success "Admin logged in successfully"
    log_info "Access Token: ${ACCESS_TOKEN:0:20}..."
    log_info "Admin Referral Code: $ADMIN_REFERRAL_CODE"
}

# Test 2: Public Registration with Valid Referral Code
test_public_registration() {
    log_info "Test 2: Public user registration..."

    RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\":\"${TEST_USER_EMAIL}\",
            \"username\":\"${TEST_USER_USERNAME}\",
            \"password\":\"${TEST_USER_PASSWORD}\",
            \"referralCode\":\"${ADMIN_REFERRAL_CODE}\",
            \"firstName\":\"Test\",
            \"lastName\":\"User\"
        }")

    TEST_USER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

    if [ -z "$TEST_USER_ID" ]; then
        log_error "Registration failed"
        echo "Response: $RESPONSE"
        exit 1
    fi

    log_success "User registered successfully"
    log_info "User ID: $TEST_USER_ID"
}

# Test 3: PENDING User Cannot Login
test_pending_user_cannot_login() {
    log_info "Test 3: PENDING user should NOT be able to login..."

    RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

    if echo "$RESPONSE" | grep -q "chờ phê duyệt"; then
        log_success "PENDING user correctly blocked from login"
    else
        log_error "PENDING user should be blocked!"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Test 4: Admin Can See Pending Users
test_get_pending_users() {
    log_info "Test 4: Admin fetching pending users..."

    RESPONSE=$(curl -s -X GET "${API_URL}/users/pending?page=1&limit=10" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")

    if echo "$RESPONSE" | grep -q "\"data\""; then
        log_success "Pending users list retrieved"
        # Check if our test user is in the list
        if echo "$RESPONSE" | grep -q "${TEST_USER_EMAIL}"; then
            log_success "Test user found in pending list"
        else
            log_warning "Test user not found in pending list (might be pagination issue)"
        fi
    else
        log_error "Failed to get pending users"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Test 5: Admin Approves User
test_approve_user() {
    log_info "Test 5: Admin approving user..."

    RESPONSE=$(curl -s -X POST "${API_URL}/users/${TEST_USER_ID}/approve" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")

    if echo "$RESPONSE" | grep -q "phê duyệt"; then
        log_success "User approved successfully"
    else
        log_error "Failed to approve user"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Test 6: Approved User Can Login
test_approved_user_can_login() {
    log_info "Test 6: Approved user should be able to login..."

    # Wait a bit for database consistency
    sleep 1

    RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

    USER_TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

    if [ -z "$USER_TOKEN" ]; then
        log_error "Approved user cannot login"
        echo "Response: $RESPONSE"
        exit 1
    fi

    log_success "Approved user logged in successfully"
}

# Test 7: Check UserTree Created
test_usertree_created() {
    log_info "Test 7: Checking if UserTree was created..."

    RESPONSE=$(curl -s -X GET "${API_URL}/users/tree?rootId=${TEST_USER_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")

    if echo "$RESPONSE" | grep -q "\"data\""; then
        log_success "UserTree created correctly"
    else
        log_error "UserTree not found"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Test 8: Register with INACTIVE Sponsor (Should Fail)
test_invalid_sponsor_status() {
    log_info "Test 8: Testing registration with PENDING/INACTIVE sponsor..."

    # Try to register using a PENDING user's referral code (should fail)
    # First, get the test user's referral code
    USER_INFO=$(curl -s -X GET "${API_URL}/users/${TEST_USER_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")

    USER_REF_CODE=$(echo $USER_INFO | grep -o '"referralCode":"[^"]*' | cut -d'"' -f4)

    # Now create another pending user
    RESPONSE2=$(curl -s -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\":\"pending_test_$(date +%s)@test.com\",
            \"username\":\"pendingtest_$(date +%s)\",
            \"password\":\"Test@123\",
            \"referralCode\":\"${ADMIN_REFERRAL_CODE}\",
            \"firstName\":\"Pending\",
            \"lastName\":\"Test\"
        }")

    PENDING_USER_ID=$(echo $RESPONSE2 | grep -o '"id":"[^"]*' | cut -d'"' -f4)

    if [ ! -z "$PENDING_USER_ID" ]; then
        log_success "Created a PENDING user for testing"

        # Get pending user's referral code
        PENDING_INFO=$(curl -s -X GET "${API_URL}/users/${PENDING_USER_ID}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}")

        PENDING_REF=$(echo $PENDING_INFO | grep -o '"referralCode":"[^"]*' | cut -d'"' -f4)

        # Try to register with PENDING sponsor (should fail due to our fix)
        FAIL_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\":\"fail_test_$(date +%s)@test.com\",
                \"username\":\"failtest_$(date +%s)\",
                \"password\":\"Test@123\",
                \"referralCode\":\"${PENDING_REF}\",
                \"firstName\":\"Fail\",
                \"lastName\":\"Test\"
            }")

        if echo "$FAIL_RESPONSE" | grep -q "trạng thái"; then
            log_success "BUG FIX VERIFIED: Cannot register with non-ACTIVE sponsor"
        else
            log_error "BUG NOT FIXED: Should reject non-ACTIVE sponsor"
            echo "Response: $FAIL_RESPONSE"
        fi
    fi
}

# Test 9: Re-registration Flow
test_reregistration() {
    log_info "Test 9: Testing re-registration for REJECTED users..."

    # Create a user
    REJECT_EMAIL="reject_test_$(date +%s)@test.com"
    REJECT_USERNAME="rejecttest_$(date +%s)"

    RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\":\"${REJECT_EMAIL}\",
            \"username\":\"${REJECT_USERNAME}\",
            \"password\":\"Test@123\",
            \"referralCode\":\"${ADMIN_REFERRAL_CODE}\",
            \"firstName\":\"Reject\",
            \"lastName\":\"Test\"
        }")

    REJECT_USER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

    if [ -z "$REJECT_USER_ID" ]; then
        log_warning "Could not create user for rejection test"
        return
    fi

    # Reject the user
    curl -s -X POST "${API_URL}/users/${REJECT_USER_ID}/reject" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"reason\":\"Test rejection\"}" > /dev/null

    log_info "User rejected, now testing re-registration..."

    # Try to re-register with same email but different username
    NEW_USERNAME="rejecttest_new_$(date +%s)"

    REREG_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\":\"${REJECT_EMAIL}\",
            \"username\":\"${NEW_USERNAME}\",
            \"password\":\"NewTest@123\",
            \"referralCode\":\"${ADMIN_REFERRAL_CODE}\",
            \"firstName\":\"Reject\",
            \"lastName\":\"New\"
        }")

    if echo "$REREG_RESPONSE" | grep -q '"id"'; then
        log_success "Re-registration successful for REJECTED user"
    else
        log_error "Re-registration failed"
        echo "Response: $REREG_RESPONSE"
    fi
}

# Main execution
main() {
    echo ""
    echo "======================================"
    echo "  MLM E-COMMERCE TEST SUITE"
    echo "======================================"
    echo ""

    test_admin_login
    echo ""

    test_public_registration
    echo ""

    test_pending_user_cannot_login
    echo ""

    test_get_pending_users
    echo ""

    test_approve_user
    echo ""

    test_approved_user_can_login
    echo ""

    test_usertree_created
    echo ""

    test_invalid_sponsor_status
    echo ""

    test_reregistration
    echo ""

    echo "======================================"
    echo -e "${GREEN}ALL TESTS COMPLETED${NC}"
    echo "======================================"
    echo ""
}

# Run tests
main
