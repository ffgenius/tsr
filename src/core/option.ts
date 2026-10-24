import { OptionUnwrapError } from './errors.js'
import { Result } from './result.js'

export class Option<T> {
  private static readonly noneValue = new Option<never>('none', undefined)

  private constructor(
    readonly kind: 'some' | 'none',
    private readonly value: T | undefined
  ) {}

  static some<T>(value: T): Option<T> {
    return new Option('some', value)
  }

  static none<T = never>(): Option<T> {
    return Option.noneValue as Option<T>
  }

  static fromNullable<T>(value: T | null | undefined): Option<NonNullable<T>> {
    return value === null || value === undefined
      ? Option.none()
      : Option.some(value as NonNullable<T>)
  }

  map<U>(fn: (value: T) => U): Option<U> {
    return this.isSome() ? Option.some(fn(this.value as T)) : Option.none()
  }

  andThen<U>(fn: (value: T) => Option<U>): Option<U> {
    return this.isSome() ? fn(this.value as T) : Option.none()
  }

  filter<S extends T>(predicate: (value: T) => value is S): Option<S>
  filter(predicate: (value: T) => boolean): Option<T>
  filter(predicate: (value: T) => boolean): Option<T> {
    return this.isSome() && predicate(this.value as T) ? this : Option.none()
  }

  flatten<U>(this: Option<Option<U>>): Option<U> {
    return this.isSome() ? (this.value as Option<U>) : Option.none()
  }

  zip<U>(other: Option<U>): Option<[T, U]> {
    return this.isSome() && other.isSome()
      ? Option.some([this.value as T, other.value as U])
      : Option.none()
  }

  unwrap(): T {
    if (this.isNone()) {
      throw new OptionUnwrapError('Called Option.unwrap() on a None value')
    }

    return this.value as T
  }

  expect(message: string): T {
    if (this.isNone()) {
      throw new OptionUnwrapError(message)
    }

    return this.value as T
  }

  unwrapOr(defaultValue: T): T {
    return this.isSome() ? (this.value as T) : defaultValue
  }

  unwrapOrElse(defaultValue: () => T): T {
    return this.isSome() ? (this.value as T) : defaultValue()
  }

  okOr<E>(error: E): Result<T, E> {
    return this.isSome() ? Result.ok(this.value as T) : Result.err(error)
  }

  isSome(): this is Option<T> & { readonly kind: 'some' } {
    return this.kind === 'some'
  }

  isNone(): this is Option<T> & { readonly kind: 'none' } {
    return this.kind === 'none'
  }

  match<U>(cases: { some: (value: T) => U; none: () => U }): U {
    return this.isSome() ? cases.some(this.value as T) : cases.none()
  }
}

export const None: Option<never> = Option.none()

export function Some<T>(value: T): Option<T> {
  return Option.some(value)
}
