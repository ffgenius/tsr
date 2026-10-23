import { describe, expect, it } from 'vite-plus/test'

import {
  bounded,
  finiteNumber,
  isFiniteNumber,
  isNegative,
  isNonZero,
  isPositive,
  negative,
  nonZero,
  positive,
} from '../index.js'

describe('@tsr/std numeric constraints', () => {
  it('validates finite, non-zero, positive, and negative numbers', () => {
    expect(finiteNumber(1).unwrap()).toBe(1)
    expect(nonZero(-1).unwrap()).toBe(-1)
    expect(positive(1).unwrap()).toBe(1)
    expect(negative(-1).unwrap()).toBe(-1)

    expect(finiteNumber(Number.NaN).isErr()).toBe(true)
    expect(finiteNumber(Number.POSITIVE_INFINITY).isErr()).toBe(true)
    expect(nonZero(0).isErr()).toBe(true)
    expect(nonZero(-0).isErr()).toBe(true)
    expect(nonZero(Number.NaN).isErr()).toBe(true)
    expect(positive(0).isErr()).toBe(true)
    expect(negative(0).isErr()).toBe(true)

    expect(isFiniteNumber(2)).toBe(true)
    expect(isNonZero(-2)).toBe(true)
    expect(isPositive(2)).toBe(true)
    expect(isNegative(-2)).toBe(true)
    expect(isFiniteNumber('2')).toBe(false)
    expect(isNonZero(null)).toBe(false)
  })

  it('validates inclusive finite bounds', () => {
    expect(bounded(1, 1, 3).unwrap()).toBe(1)
    expect(bounded(3, 1, 3).unwrap()).toBe(3)
    expect(bounded(0, 1, 3).isErr()).toBe(true)
    expect(bounded(4, 1, 3).isErr()).toBe(true)
    expect(bounded(2, 3, 1).isErr()).toBe(true)
    expect(bounded(Number.NaN, 1, 3).isErr()).toBe(true)
    expect(bounded(2, Number.NEGATIVE_INFINITY, 3).isErr()).toBe(true)
  })
})
