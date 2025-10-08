export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  CUSTOMER = 'CUSTOMER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 4,
  [UserRole.MANAGER]: 3,
  [UserRole.DISTRIBUTOR]: 2,
  [UserRole.CUSTOMER]: 1,
};

// Who can create which roles
export const ROLE_CREATION_PERMISSIONS: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MANAGER],
  [UserRole.MANAGER]: [UserRole.DISTRIBUTOR],
  [UserRole.DISTRIBUTOR]: [UserRole.CUSTOMER],
  [UserRole.CUSTOMER]: [UserRole.CUSTOMER],
};
