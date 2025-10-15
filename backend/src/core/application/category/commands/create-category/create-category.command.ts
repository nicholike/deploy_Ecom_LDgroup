export class CreateCategoryCommand {
  constructor(
    public readonly name: string,
    public readonly description?: string,
    public readonly parentId?: string,
    public readonly image?: string,
    public readonly order?: number,
    public readonly active?: boolean,
  ) {}
}
