import { UserRole, UserStatus } from '@shared/constants/user-roles.constant';

export class GetUserTreeQuery {
  constructor(
    public readonly rootId?: string,
    public readonly role?: UserRole,
    public readonly status?: UserStatus,
    public readonly maxDepth?: number,
  ) {}
}
