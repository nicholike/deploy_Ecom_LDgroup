import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';

export class ListUsersQuery {
  constructor(
    public readonly page?: number,
    public readonly limit?: number,
    public readonly role?: UserRole,
    public readonly status?: UserStatus,
    public readonly search?: string,
  ) {}
}
