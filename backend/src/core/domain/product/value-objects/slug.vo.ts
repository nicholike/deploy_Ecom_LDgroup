export class Slug {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): Slug {
    const slug = this.slugify(value);
    if (!slug || slug.length === 0) {
      throw new Error('Slug cannot be empty');
    }
    if (slug.length > 200) {
      throw new Error('Slug cannot exceed 200 characters');
    }
    return new Slug(slug);
  }

  static fromString(slug: string): Slug {
    if (!slug || slug.length === 0) {
      throw new Error('Slug cannot be empty');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error('Invalid slug format');
    }
    return new Slug(slug);
  }

  private static slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      // Remove accents
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace spaces with -
      .replace(/\s+/g, '-')
      // Remove all non-word chars
      .replace(/[^\w-]+/g, '')
      // Replace multiple - with single -
      .replace(/--+/g, '-')
      // Remove leading and trailing -
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  get value(): string {
    return this._value;
  }

  equals(other: Slug): boolean {
    return this._value === other._value;
  }
}
