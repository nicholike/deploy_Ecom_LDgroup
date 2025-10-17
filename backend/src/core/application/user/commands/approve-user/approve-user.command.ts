export class ApproveUserCommand {
  constructor(
    public readonly userId: string,       // User to approve
    public readonly adminId: string,      // Admin performing the approval
  ) {}
}
