import { ResultUnwrapError } from './errors.js'
import { Option } from './option.js'

export class Result<T, E> {
  private constructor(
    readonly kind: 'ok' | 'err',
    private readonly value: T | undefined,
    private readonly error: E | undefined
  ) {}

  static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>('ok', value, undefined)
  }

  static err<E, T = never>(error: E): Result<T, E> {
    return new Result<T, E>('err', undefined, error)
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.isOk()
      ? Result.ok(fn(this.value as T))
      : Result.err(this.error as E)
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return this.isErr()
      ? Result.err(fn(this.error as E))
      : Result.ok(this.value as T)
  }

  andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return this.isOk() ? fn(this.value as T) : Result.err(this.error as E)
  }

  orElse<U, F>(fn: (error: E) => Result<U, F>): Result<T | U, F> {
    return this.isErr() ? fn(this.error as E) : Result.ok(this.value as T)
  }

  unwrap(): T {
    if (this.isErr()) {
      throw new ResultUnwrapError(
        'Called Result.unwrap() on an Err value',
        this.error
      )
    }

    return this.value as T
  }

  expect(message: string): T {
    if (this.isErr()) {
      throw new ResultUnwrapError(message, this.error)
    }

    return this.value as T
  }

  unwrapOr(defaultValue: T): T {
    return this.isOk() ? (this.value as T) : defaultValue
  }

  unwrapOrElse(defaultValue: (error: E) => T): T {
    return this.isOk() ? (this.value as T) : defaultValue(this.error as E)
  }

  unwrapErr(): E {
    if (this.isOk()) {
      throw new ResultUnwrapError(
        'Called Result.unwrapErr() on an Ok value',
        this.value
      )
    }

    return this.error as E
  }

  isOk(): this is Result<T, E> & { readonly kind: 'ok' } {
    return this.kind === 'ok'
  }

  isErr(): this is Result<T, E> & { readonly kind: 'err' } {
    return this.kind === 'err'
  }

  ok(): Option<T> {
    return this.isOk() ? Option.some(this.value as T) : Option.none()
  }

  err(): Option<E> {
    return this.isErr() ? Option.some(this.error as E) : Option.none()
  }

  match<U>(cases: { ok: (value: T) => U; err: (error: E) => U }): U {
    return this.isOk() ? cases.ok(this.value as T) : cases.err(this.error as E)
  }

  transpose<U>(this: Result<Option<U>, E>): Option<Result<U, E>> {
    return this.isErr()
      ? Option.some(Result.err(this.error as E))
      : (this.value as Option<U>).map((value) => Result.ok(value))
  }

  flatten<U, F>(this: Result<Result<U, F>, E>): Result<U, E | F> {
    return this.isErr()
      ? Result.err(this.error as E)
      : (this.value as Result<U, F>)
  }
}

export function Ok<T, E = never>(value: T): Result<T, E> {
  return Result.ok(value)
}

export function Err<E, T = never>(error: E): Result<T, E> {
  return Result.err(error)
}
