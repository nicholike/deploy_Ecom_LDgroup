export class UpdateCategoryCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly parentId?: string | null, // null to remove parent
    public readonly image?: string,
    public readonly order?: number,
    public readonly active?: boolean,
  ) {}
}
