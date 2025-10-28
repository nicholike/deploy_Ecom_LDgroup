export class DeleteUserCommand {
  constructor(
    public readonly userId: string,
    public readonly confirmed: boolean = false, // Admin must confirm if there are warnings
  ) {}
}
