export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
    public readonly referralCode: string, // Required - to identify sponsor
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phone?: string,
  ) {}
}
