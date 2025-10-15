export class GetProductQuery {
  constructor(
    public readonly id?: string,
    public readonly slug?: string,
    public readonly sku?: string,
  ) {
    if (!id && !slug && !sku) {
      throw new Error('At least one identifier (id, slug, or sku) must be provided');
    }
  }
}
