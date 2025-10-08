export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
    },
  ) {}
}
