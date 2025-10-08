/**
 * Application routes constants
 */

export const ROUTES = {
  // Public
  HOME: '/',
  PRODUCTS: '/products',
  ABOUT: '/about',

  // Auth
  LOGIN: '/login',

  // Dashboard (Admin)
  DASHBOARD: '/dashboard',
  DASHBOARD_USERS: '/dashboard/users',
  DASHBOARD_USERS_CREATE: '/dashboard/users/create',
  DASHBOARD_PRODUCTS: '/dashboard/products',
  DASHBOARD_ORDERS: '/dashboard/orders',
  DASHBOARD_COMMISSIONS: '/dashboard/commissions',
  DASHBOARD_WITHDRAWALS: '/dashboard/withdrawals',
  DASHBOARD_REPORTS: '/dashboard/reports',
  DASHBOARD_SETTINGS: '/dashboard/settings',

  // Distributor
  DISTRIBUTOR: '/distributor',
  DISTRIBUTOR_NETWORK: '/distributor/network',
  DISTRIBUTOR_CUSTOMERS: '/distributor/customers',
  DISTRIBUTOR_COMMISSIONS: '/distributor/commissions',
  DISTRIBUTOR_ORDERS: '/distributor/orders',
  DISTRIBUTOR_REFERRAL: '/distributor/referral',

  // Customer
  CUSTOMER: '/customer',
  CUSTOMER_ORDERS: '/customer/orders',
  CUSTOMER_COMMISSIONS: '/customer/commissions',
  CUSTOMER_NETWORK: '/customer/network',
  CUSTOMER_REFERRAL: '/customer/referral',
} as const;
