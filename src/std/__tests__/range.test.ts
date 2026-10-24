import { describe, expect, it } from 'vite-plus/test'

import { range } from '../index.js'

describe('@tsr/std range', () => {
  it('produces integers according to each endpoint convention', () => {
    expect([...range.closed(1, 3)]).toEqual([1, 2, 3])
    expect([...range.open(1, 3)]).toEqual([2])
    expect([...range.closedOpen(1, 3)]).toEqual([1, 2])
    expect([...range.openClosed(1, 3)]).toEqual([2, 3])
  })

  it('handles equal and reversed endpoints', () => {
    expect([...range.closed(2, 2)]).toEqual([2])
    expect([...range.open(2, 2)]).toEqual([])
    expect([...range.closedOpen(2, 2)]).toEqual([])
    expect([...range.openClosed(2, 2)]).toEqual([])
    expect([...range.closed(3, 1)]).toEqual([])
  })

  it('validates endpoints before iteration', () => {
    expect(() => range.closed(0.5, 2)).toThrow(RangeError)
    expect(() => range.open(Number.NaN, 2)).toThrow(RangeError)
    expect(() => range.closedOpen(0, Number.POSITIVE_INFINITY)).toThrow(
      RangeError
    )
    expect(() => range.openClosed(0, Number.MAX_SAFE_INTEGER + 1)).toThrow(
      RangeError
    )
  })

  it('can be consumed more than once', () => {
    const values = range.closed(1, 3)

    expect(typeof values[Symbol.iterator]).toBe('function')
    expect([...values]).toEqual([1, 2, 3])
    expect([...values]).toEqual([1, 2, 3])
  })
})
