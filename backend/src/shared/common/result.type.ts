/**
 * Result pattern for handling success/failure cases
 * Prevents throwing exceptions for business logic errors
 */
export class Result<T, E = Error> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: E,
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result<T>(true, value, undefined);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined, error);
  }

  static combine(results: Result<any>[]): Result<any> {
    for (const result of results) {
      if (!result.isSuccess) {
        return result;
      }
    }
    return Result.ok(null);
  }
}
