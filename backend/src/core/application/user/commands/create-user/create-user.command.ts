import { UserRole } from '@shared/constants/user-roles.constant';

export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
    public readonly role: UserRole,
    public readonly sponsorId: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phone?: string,
  ) {}
}
