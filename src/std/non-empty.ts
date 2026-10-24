import { Result } from '../core/index.js'

declare const nonEmptyStringBrand: unique symbol
declare const nonEmptyArrayBrand: unique symbol

export type NonEmptyString = string & {
  readonly [nonEmptyStringBrand]: true
}

export type NonEmptyArray<T> = readonly [T, ...T[]] & {
  readonly [nonEmptyArrayBrand]: true
}

export function isNonEmptyString(value: unknown): value is NonEmptyString {
  return typeof value === 'string' && value.length > 0
}

export function nonEmptyString(
  value: string
): Result<NonEmptyString, RangeError> {
  return isNonEmptyString(value)
    ? Result.ok(value)
    : Result.err(new RangeError('Expected a non-empty string'))
}

export function isNonEmptyArray<T>(
  value: readonly T[]
): value is NonEmptyArray<T>
export function isNonEmptyArray(value: unknown): value is NonEmptyArray<unknown>
export function isNonEmptyArray(
  value: unknown
): value is NonEmptyArray<unknown> {
  return Array.isArray(value) && value.length > 0
}

export function nonEmptyArray<T>(
  value: readonly T[]
): Result<NonEmptyArray<T>, RangeError> {
  return isNonEmptyArray(value)
    ? Result.ok(Object.freeze([...value]) as unknown as NonEmptyArray<T>)
    : Result.err(new RangeError('Expected a non-empty array'))
}
