# Payment Setup Guide - SePay Integration

## Overview
This guide explains how to set up payment integration with SePay for bank transfer payments.

Reference: [SePay Programming Guide](https://sepay.vn/lap-trinh-cong-thanh-toan.html)

## Environment Variables

Add the following variables to your `.env` or `.env.local` file:

```env
# SePay Configuration (Optional - for future direct API integration)
SEPAY_API_KEY=your_sepay_api_key
SEPAY_SECRET_KEY=your_sepay_secret_key

# Bank Account Information (Required for VietQR)
BANK_CODE=VCB
BANK_NAME=Vietcombank
BANK_ACCOUNT_NUMBER=your_account_number
BANK_ACCOUNT_NAME=YOUR COMPANY NAME
```

## How It Works

### 1. **Customer Places Order**
   - Customer creates an order through the website
   - System generates order code (e.g., `ORD202501231234`)

### 2. **Display Payment Information**
   - Frontend displays:
     - VietQR code (generated dynamically)
     - Bank account details
     - Transfer amount
     - Transfer content: Order code (e.g., `ORD202501231234`)

### 3. **Customer Makes Payment**
   - Customer scans QR code or manually transfers money
   - **Important**: Customer must include order code in transfer content

### 4. **SePay Webhook**
   - SePay monitors your bank account for incoming transactions
   - When transaction detected, SePay sends webhook to: `POST /api/v1/payment/sepay-webhook`
   - Webhook includes:
     - Transaction amount
     - Transaction content (contains order code)
     - Bank details
     - Transaction timestamp

### 5. **Automatic Processing**
   - Backend receives webhook
   - Extracts order code from transaction content
   - Matches with order in database
   - Verifies amount matches order total (±1% tolerance)
   - Updates order payment status to COMPLETED
   - Sends notification to user

## SePay Setup Steps

### 1. Register SePay Account
   - Visit: https://my.sepay.vn
   - Sign up for an account
   - Connect your bank account

### 2. Create Webhook
   - Go to SePay Dashboard > Webhooks
   - Create new webhook
   - Set webhook URL: `https://your-domain.com/api/v1/payment/sepay-webhook`
   - Save webhook secret key

### 3. Configure Order Code Format
   Your orders are automatically assigned order numbers like:
   - `ORD202501231234`
   - Customers must include this in transfer content

## API Endpoints

### 1. Get Payment Info (User)
```
GET /api/v1/payment/info/:orderId
Authorization: Bearer {token}
```

Response:
```json
{
  "orderId": "uuid",
  "orderNumber": "ORD202501231234",
  "amount": 500000,
  "paymentStatus": "PENDING",
  "bankAccount": {
    "accountNumber": "1234567890",
    "accountName": "YOUR COMPANY",
    "bankCode": "VCB",
    "bankName": "Vietcombank"
  },
  "description": "ORD202501231234",
  "qrCodeUrl": "https://img.vietqr.io/image/VCB-1234567890-compact2.jpg?amount=500000&addInfo=ORD202501231234"
}
```

### 2. Check Payment Status (User)
```
GET /api/v1/payment/status/:orderId
Authorization: Bearer {token}
```

Response:
```json
{
  "orderId": "uuid",
  "orderNumber": "ORD202501231234",
  "paymentStatus": "COMPLETED",
  "paidAt": "2025-01-23T10:30:00Z",
  "transactions": [
    {
      "id": "uuid",
      "gateway": "VCB",
      "amount": 500000,
      "transactionDate": "2025-01-23T10:30:00Z",
      "referenceNumber": "FT2501231234"
    }
  ]
}
```

### 3. SePay Webhook (Public - No Auth)
```
POST /api/v1/payment/sepay-webhook
Content-Type: application/json
```

Example payload from SePay:
```json
{
  "id": 123456,
  "gateway": "VCB",
  "transaction_date": "2025-01-23 10:30:00",
  "account_number": "1234567890",
  "sub_account": "",
  "amount_in": 500000.00,
  "amount_out": 0.00,
  "accumulated": 10000000.00,
  "code": "ABC123",
  "transaction_content": "ORD202501231234 thanh toan don hang",
  "reference_number": "FT2501231234",
  "body": "raw data..."
}
```

### 4. Get All Transactions (Admin)
```
GET /api/v1/payment/admin/transactions?page=1&limit=20
Authorization: Bearer {admin_token}
```

### 5. Test Webhook (Development Only)
```
POST /api/v1/payment/test-webhook
Content-Type: application/json
```

Request body:
```json
{
  "orderNumber": "ORD202501231234",
  "amount": 500000,
  "gateway": "VCB"
}
```

This simulates a SePay webhook for testing.

## Database Schema

### BankTransaction Model
Stores all bank transactions received from SePay:

```prisma
model BankTransaction {
  id                 String    @id @default(uuid())
  sepayTransactionId Int?      @unique
  gateway            String    // VCB, ACB, BIDV, etc.
  transactionDate    DateTime
  accountNumber      String
  subAccount         String?
  amountIn           Decimal
  amountOut          Decimal
  accumulated        Decimal
  code               String?
  transactionContent String    @db.Text
  referenceNumber    String?
  body               String?   @db.Text
  orderId            String?
  order              Order?    @relation(fields: [orderId], references: [id])
  processed          Boolean   @default(false)
  processedAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}
```

## Transaction Matching Logic

The system automatically matches transactions with orders by:

1. **Extracting order code** from `transaction_content`
   - Regex: `/(?:ORD|ORDER|DH)[\-\s]?(\d{6,})/i`
   - Matches: `ORD123456`, `ORDER123456`, `DH123456`, etc.

2. **Finding order** by order number

3. **Verifying amount** (within 1% tolerance)

4. **Updating payment status** if matched

## Frontend Integration

Display payment information after order creation:

```typescript
// Get payment info
const paymentInfo = await paymentService.getPaymentInfo(orderId, token);

// Display QR code
<img src={paymentInfo.qrCodeUrl} alt="QR Code" />

// Display bank details
<div>
  <p>Ngân hàng: {paymentInfo.bankAccount.bankName}</p>
  <p>Số tài khoản: {paymentInfo.bankAccount.accountNumber}</p>
  <p>Chủ tài khoản: {paymentInfo.bankAccount.accountName}</p>
  <p>Số tiền: {paymentInfo.amount.toLocaleString('vi-VN')} VNĐ</p>
  <p>Nội dung: {paymentInfo.description}</p>
</div>

// Poll for payment status
const checkStatus = async () => {
  const status = await paymentService.checkPaymentStatus(orderId, token);
  if (status.paymentStatus === 'COMPLETED') {
    // Show success message
  }
};

// Poll every 5 seconds
const interval = setInterval(checkStatus, 5000);
```

## Security Notes

1. **Webhook Endpoint**: Public endpoint, no authentication required
2. **Duplicate Prevention**: Checks `sepayTransactionId` to prevent duplicate processing
3. **Amount Verification**: Verifies transaction amount matches order amount (±1% tolerance)
4. **Manual Review**: If amount doesn't match, transaction is saved but requires manual review

## Support

- SePay Documentation: https://sepay.vn/lap-trinh-cong-thanh-toan.html
- SePay API Docs: https://my.sepay.vn/developers
- SePay Support: info@sepay.vn
- Phone: 02873.059.589


