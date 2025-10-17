export class RejectUserCommand {
  constructor(
    public readonly userId: string,       // User to reject
    public readonly adminId: string,      // Admin performing the rejection
    public readonly reason: string,       // Reason for rejection
  ) {}
}
