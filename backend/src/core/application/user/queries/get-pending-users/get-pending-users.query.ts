export class GetPendingUsersQuery {
  constructor(
    public readonly page?: number,
    public readonly limit?: number,
    public readonly search?: string,  // Search by email, username, name
  ) {}
}
