import { describe, expect, it } from 'vite-plus/test'

import { Iter } from '../index.js'

describe('@tsr/iter', () => {
  it('keeps adapters lazy until collection', () => {
    let produced = 0
    let mapped = 0
    let filtered = 0

    function* values() {
      produced++
      yield 1
      produced++
      yield 2
      produced++
      yield 3
    }

    const iter = Iter.from(values())
      .map((value) => {
        mapped++
        return value * 2
      })
      .filter((value) => {
        filtered++
        return value > 2
      })
      .take(1)

    expect([produced, mapped, filtered]).toEqual([0, 0, 0])
    expect(iter.collect()).toEqual([4])
    expect([produced, mapped, filtered]).toEqual([2, 2, 2])
  })

  it('consumes a source once and returns only remaining values', () => {
    const iter = Iter.from([1, 2, 3])

    expect(iter.next()).toEqual({ done: false, value: 1 })
    expect(iter.collect()).toEqual([2, 3])
    expect(iter.collect()).toEqual([])
    expect(iter.next()).toEqual({ done: true, value: undefined })
  })

  it('stops reading the source at the take limit', () => {
    let reads = 0
    const source: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next() {
            reads++
            return reads <= 3
              ? { done: false as const, value: reads }
              : { done: true as const, value: undefined }
          },
        }
      },
    }

    expect(Iter.from(source).take(2).collect()).toEqual([1, 2])
    expect(reads).toBe(2)
  })

  it('does not initialize or read a source for take(0)', () => {
    let initialized = 0
    const source: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return [1, 2][Symbol.iterator]()
      },
    }

    expect(Iter.from(source).take(0).collect()).toEqual([])
    expect(initialized).toBe(0)
  })

  it('rejects invalid take counts without consuming the source', () => {
    const iter = Iter.from([1, 2, 3])

    expect(() => iter.take(-1)).toThrow(RangeError)
    expect(() => iter.take(1.5)).toThrow(RangeError)
    expect(() => iter.take(Number.NaN)).toThrow(RangeError)
    expect(() => iter.take(Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(iter.collect()).toEqual([1, 2, 3])
  })
})
