/**
 * Application configuration constants
 */

export const APP_CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  APP_NAME: 'MLM E-commerce',
  APP_DESCRIPTION: 'Multi-Level Marketing E-commerce Platform',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  LIMIT_OPTIONS: [10, 20, 50, 100],
} as const;

export const QUERY_KEYS = {
  // User
  USERS: 'users',
  USER: 'user',
  USER_TREE: 'user-tree',
  
  // Auth
  AUTH_ME: 'auth-me',
  
  // Product
  PRODUCTS: 'products',
  PRODUCT: 'product',
  
  // Order
  ORDERS: 'orders',
  ORDER: 'order',
  
  // Commission
  COMMISSIONS: 'commissions',
  COMMISSION_SUMMARY: 'commission-summary',
  
  // Withdrawal
  WITHDRAWALS: 'withdrawals',
  WITHDRAWAL: 'withdrawal',
} as const;
