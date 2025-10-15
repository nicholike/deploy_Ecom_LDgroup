export class GetCategoryQuery {
  constructor(
    public readonly id?: string,
    public readonly slug?: string,
  ) {
    if (!id && !slug) {
      throw new Error('At least one identifier (id or slug) must be provided');
    }
  }
}
