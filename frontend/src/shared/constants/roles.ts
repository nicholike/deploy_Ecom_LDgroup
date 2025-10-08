/**
 * User roles and permissions
 */

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  DISTRIBUTOR: 'DISTRIBUTOR',
  CUSTOMER: 'CUSTOMER',
} as const;

export const ROLE_HIERARCHY = {
  ADMIN: 4,
  MANAGER: 3,
  DISTRIBUTOR: 2,
  CUSTOMER: 1,
} as const;

export const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  DISTRIBUTOR: 'Nhà phân phối',
  CUSTOMER: 'Khách hàng',
} as const;
