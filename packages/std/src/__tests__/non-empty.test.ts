import { describe, expect, it } from 'vite-plus/test'

import {
  isNonEmptyArray,
  isNonEmptyString,
  nonEmptyArray,
  nonEmptyString,
} from '../index.js'

describe('@tsr/std non-empty values', () => {
  it('constructs non-empty strings and rejects empty strings', () => {
    expect(nonEmptyString('text').unwrap()).toBe('text')
    expect(nonEmptyString('').isErr()).toBe(true)
    expect(isNonEmptyString('text')).toBe(true)
    expect(isNonEmptyString('')).toBe(false)
    expect(isNonEmptyString(null)).toBe(false)
  })

  it('constructs frozen copies of non-empty arrays', () => {
    const source = [1, 2]
    const result = nonEmptyArray(source)
    const values = result.unwrap()

    expect(values).toEqual([1, 2])
    expect(values).not.toBe(source)
    expect(Object.isFrozen(values)).toBe(true)
    expect(nonEmptyArray([]).isErr()).toBe(true)
    expect(isNonEmptyArray([1])).toBe(true)
    expect(isNonEmptyArray([])).toBe(false)
    expect(isNonEmptyArray(null)).toBe(false)
  })
})
