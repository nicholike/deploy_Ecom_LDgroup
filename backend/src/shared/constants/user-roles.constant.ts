export enum UserRole {
  ADMIN = 'ADMIN',
  F1 = 'F1',
  F2 = 'F2',
  F3 = 'F3',
  F4 = 'F4',
  F5 = 'F5',
  F6 = 'F6',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

// Role hierarchy for permission checks (higher number = higher level)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 7,
  [UserRole.F1]: 6,
  [UserRole.F2]: 5,
  [UserRole.F3]: 4,
  [UserRole.F4]: 3,
  [UserRole.F5]: 2,
  [UserRole.F6]: 1,
};

// Only admin can create accounts. Other roles cannot create new members.
export const ROLE_CREATION_PERMISSIONS: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.F1, UserRole.F2, UserRole.F3, UserRole.F4, UserRole.F5, UserRole.F6],
  [UserRole.F1]: [],
  [UserRole.F2]: [],
  [UserRole.F3]: [],
  [UserRole.F4]: [],
  [UserRole.F5]: [],
  [UserRole.F6]: [],
};
