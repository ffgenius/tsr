import { Result } from '../core/index.js'

declare const nonZeroBrand: unique symbol
declare const positiveBrand: unique symbol
declare const negativeBrand: unique symbol
declare const finiteNumberBrand: unique symbol
declare const boundedBrand: unique symbol

export type NonZero = number & { readonly [nonZeroBrand]: true }
export type Positive = number & { readonly [positiveBrand]: true }
export type Negative = number & { readonly [negativeBrand]: true }
export type FiniteNumber = number & { readonly [finiteNumberBrand]: true }
export type Bounded<Min extends number, Max extends number> = number & {
  readonly [boundedBrand]: { min: Min; max: Max }
}

export function isFiniteNumber(value: unknown): value is FiniteNumber {
  return typeof value === 'number' && Number.isFinite(value)
}

export function finiteNumber(value: number): Result<FiniteNumber, RangeError> {
  return isFiniteNumber(value)
    ? Result.ok(value)
    : Result.err(new RangeError('Expected a finite number'))
}

export function isNonZero(value: unknown): value is NonZero {
  return typeof value === 'number' && Number.isFinite(value) && value !== 0
}

export function nonZero(value: number): Result<NonZero, RangeError> {
  return isNonZero(value)
    ? Result.ok(value)
    : Result.err(new RangeError('Expected a finite, non-zero number'))
}

export function isPositive(value: unknown): value is Positive {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function positive(value: number): Result<Positive, RangeError> {
  return isPositive(value)
    ? Result.ok(value)
    : Result.err(new RangeError('Expected a finite, positive number'))
}

export function isNegative(value: unknown): value is Negative {
  return typeof value === 'number' && Number.isFinite(value) && value < 0
}

export function negative(value: number): Result<Negative, RangeError> {
  return isNegative(value)
    ? Result.ok(value)
    : Result.err(new RangeError('Expected a finite, negative number'))
}

export function bounded<const Min extends number, const Max extends number>(
  value: number,
  min: Min,
  max: Max
): Result<Bounded<Min, Max>, RangeError> {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return Result.err(new RangeError('Expected finite bounds with min <= max'))
  }

  return Number.isFinite(value) && value >= min && value <= max
    ? Result.ok(value as Bounded<Min, Max>)
    : Result.err(new RangeError(`Expected a number between ${min} and ${max}`))
}
