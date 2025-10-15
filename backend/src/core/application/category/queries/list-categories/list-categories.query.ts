export class ListCategoriesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly parentId?: string | null, // null = root categories
    public readonly active?: boolean,
    public readonly search?: string,
  ) {}
}
