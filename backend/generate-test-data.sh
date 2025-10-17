#!/bin/bash

# ============================================
# TEST DATA GENERATOR
# Creates realistic MLM test data
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-dieptrungnam123@gmail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Lai712004!}"

# Configurable test data size
NUM_F1_USERS="${NUM_F1_USERS:-3}"      # Number of F1 users
NUM_F2_PER_F1="${NUM_F2_PER_F1:-2}"    # Number of F2 users per F1
NUM_F3_PER_F2="${NUM_F3_PER_F2:-2}"    # Number of F3 users per F2

ACCESS_TOKEN=""
ADMIN_REF_CODE=""

log() {
    echo -e "${BLUE}[GEN]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

# Login as admin
login_admin() {
    log "Logging in as admin..."

    RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

    ACCESS_TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    ADMIN_REF_CODE=$(echo $RESPONSE | grep -o '"referralCode":"[^"]*' | cut -d'"' -f4)

    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Failed to login"
        exit 1
    fi

    success "Admin logged in. Referral: $ADMIN_REF_CODE"
}

# Generate Vietnamese names
FIRST_NAMES=("Nguyễn" "Trần" "Lê" "Phạm" "Hoàng" "Phan" "Vũ" "Đặng" "Bùi" "Đỗ")
MIDDLE_NAMES=("Văn" "Thị" "Hữu" "Minh" "Anh" "Tuấn" "Thành" "Đức" "Quốc" "Hồng")
LAST_NAMES=("An" "Bình" "Cường" "Dũng" "Hòa" "Khang" "Long" "Nam" "Phong" "Quân")

get_random_name() {
    FIRST=${FIRST_NAMES[$RANDOM % ${#FIRST_NAMES[@]}]}
    MIDDLE=${MIDDLE_NAMES[$RANDOM % ${#MIDDLE_NAMES[@]}]}
    LAST=${LAST_NAMES[$RANDOM % ${#LAST_NAMES[@]}]}
    echo "${FIRST} ${MIDDLE} ${LAST}"
}

# Register and approve user
create_user() {
    local sponsor_ref=$1
    local level=$2
    local index=$3

    TIMESTAMP=$(date +%s)
    RANDOM_NUM=$((RANDOM % 10000))

    NAME=$(get_random_name)
    FIRST_NAME=$(echo $NAME | awk '{print $1" "$2}')
    LAST_NAME=$(echo $NAME | awk '{print $3}')

    EMAIL="user_${level}_${index}_${TIMESTAMP}_${RANDOM_NUM}@test.com"
    USERNAME="user_${level}_${index}_${TIMESTAMP}_${RANDOM_NUM}"
    PASSWORD="Test@123"

    log "Creating ${level} user #${index}: ${NAME}..."

    # Register
    REG_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\":\"${EMAIL}\",
            \"username\":\"${USERNAME}\",
            \"password\":\"${PASSWORD}\",
            \"referralCode\":\"${sponsor_ref}\",
            \"firstName\":\"${FIRST_NAME}\",
            \"lastName\":\"${LAST_NAME}\"
        }")

    USER_ID=$(echo $REG_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

    if [ -z "$USER_ID" ]; then
        echo "Failed to register: $EMAIL"
        echo "Response: $REG_RESPONSE"
        return 1
    fi

    # Approve user
    curl -s -X POST "${API_URL}/users/${USER_ID}/approve" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" > /dev/null

    # Get user info to get referral code
    USER_INFO=$(curl -s -X GET "${API_URL}/users/${USER_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")

    USER_REF=$(echo $USER_INFO | grep -o '"referralCode":"[^"]*' | cut -d'"' -f4)

    success "Created & approved: ${NAME} (${level}) | Ref: ${USER_REF}"

    # Return referral code
    echo "$USER_REF"
}

# Generate test data
generate_data() {
    log "Starting test data generation..."
    log "Structure: ${NUM_F1_USERS} F1 users → ${NUM_F2_PER_F1} F2 each → ${NUM_F3_PER_F2} F3 each"
    echo ""

    # Create F1 users
    declare -a F1_REFS

    for i in $(seq 1 $NUM_F1_USERS); do
        F1_REF=$(create_user "$ADMIN_REF_CODE" "F1" "$i")
        F1_REFS+=("$F1_REF")

        # Create F2 users under this F1
        declare -a F2_REFS

        for j in $(seq 1 $NUM_F2_PER_F1); do
            F2_REF=$(create_user "$F1_REF" "F2" "${i}_${j}")
            F2_REFS+=("$F2_REF")

            # Create F3 users under this F2
            for k in $(seq 1 $NUM_F3_PER_F2); do
                create_user "$F2_REF" "F3" "${i}_${j}_${k}" > /dev/null
            done
        done
    done

    echo ""
    TOTAL_USERS=$((NUM_F1_USERS + (NUM_F1_USERS * NUM_F2_PER_F1) + (NUM_F1_USERS * NUM_F2_PER_F1 * NUM_F3_PER_F2)))
    success "Generated ${TOTAL_USERS} test users total"
}

# Create some PENDING users
create_pending_users() {
    log "Creating PENDING users for testing approval flow..."

    for i in $(seq 1 5); do
        TIMESTAMP=$(date +%s)
        RANDOM_NUM=$((RANDOM % 10000))

        NAME=$(get_random_name)
        FIRST_NAME=$(echo $NAME | awk '{print $1" "$2}')
        LAST_NAME=$(echo $NAME | awk '{print $3}')

        EMAIL="pending_${TIMESTAMP}_${RANDOM_NUM}@test.com"
        USERNAME="pending_${TIMESTAMP}_${RANDOM_NUM}"

        curl -s -X POST "${API_URL}/auth/register" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\":\"${EMAIL}\",
                \"username\":\"${USERNAME}\",
                \"password\":\"Test@123\",
                \"referralCode\":\"${ADMIN_REF_CODE}\",
                \"firstName\":\"${FIRST_NAME}\",
                \"lastName\":\"${LAST_NAME}\"
            }" > /dev/null

        success "Created PENDING: ${NAME}"
    done
}

# Main
main() {
    echo ""
    echo "======================================"
    echo "  TEST DATA GENERATOR"
    echo "======================================"
    echo ""

    login_admin
    echo ""

    generate_data
    echo ""

    create_pending_users
    echo ""

    echo "======================================"
    echo -e "${GREEN}DATA GENERATION COMPLETE${NC}"
    echo "======================================"
    echo ""
    echo "Summary:"
    echo "  - F1 users: ${NUM_F1_USERS}"
    echo "  - F2 users: $((NUM_F1_USERS * NUM_F2_PER_F1))"
    echo "  - F3 users: $((NUM_F1_USERS * NUM_F2_PER_F1 * NUM_F3_PER_F2))"
    echo "  - PENDING users: 5"
    echo "  - Total: $((NUM_F1_USERS + (NUM_F1_USERS * NUM_F2_PER_F1) + (NUM_F1_USERS * NUM_F2_PER_F1 * NUM_F3_PER_F2) + 5))"
    echo ""
}

main
