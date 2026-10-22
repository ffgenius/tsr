import { describe, expect, it } from 'vite-plus/test'

import { Iter } from '../index.js'

describe('skip and enumerate adapters', () => {
  it('defers skipping and numbering until consumption without reading ahead', () => {
    let initialized = 0
    let reads = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return {
          next() {
            reads++
            if (reads > 4) {
              throw new Error('Read past the take limit')
            }
            return { done: false, value: reads }
          },
        }
      },
    }
    const source = Iter.from(values)
    const iter = source.skip(2).enumerate().take(2)

    expect([initialized, reads]).toEqual([0, 0])
    expect(iter.next()).toEqual({ done: false, value: [0, 3] })
    expect([initialized, reads]).toEqual([1, 3])
    expect(iter.collect()).toEqual([[1, 4]])
    expect(reads).toBe(4)
    iter.return()
  })

  it('skips zero values and preserves undefined elements', () => {
    expect(Iter.from([undefined, 1]).skip(0).enumerate().collect()).toEqual([
      [0, undefined],
      [1, 1],
    ])
  })

  it('rejects invalid skip counts without consuming the source', () => {
    const source = Iter.from([1, 2, 3])

    for (const count of [-1, 1.5, Number.NaN, Infinity, -Infinity]) {
      expect(() => source.skip(count)).toThrow(
        new RangeError('Iter.skip() requires a non-negative integer')
      )
    }
    expect(source.collect()).toEqual([1, 2, 3])
  })

  it('stops skipping when the source is exhausted', () => {
    let reads = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next() {
            reads++
            return reads <= 2
              ? { done: false as const, value: reads }
              : { done: true as const, value: undefined }
          },
        }
      },
    }
    const iter = Iter.from(values).skip(10).enumerate()

    expect(iter.collect()).toEqual([])
    expect(iter.collect()).toEqual([])
    expect(reads).toBe(3)
    expect(Iter.from([1, 2]).skip(2).collect()).toEqual([])
    expect(Iter.from<number>([]).skip(1).enumerate().collect()).toEqual([])
  })

  it('skips once from the shared current position', () => {
    const source = Iter.from([1, 2, 3, 4, 5, 6])
    const skipped = source.skip(2)
    source.next()

    expect(skipped.next()).toEqual({ done: false, value: 4 })
    expect(source.next()).toEqual({ done: false, value: 5 })
    expect(skipped.collect()).toEqual([6])
    expect(source.collect()).toEqual([])
  })

  it('keeps a local index for each derived view across shared consumption', () => {
    const source = Iter.from(['a', 'b', 'c', 'd', 'e'])
    source.next()
    const first = source.enumerate()
    const second = source.enumerate()

    expect(first.next()).toEqual({ done: false, value: [0, 'b'] })
    expect(second.next()).toEqual({ done: false, value: [0, 'c'] })
    expect(first.take(1).collect()).toEqual([[1, 'd']])
    expect(first.collect()).toEqual([[2, 'e']])
    expect(second.collect()).toEqual([])
  })

  it('applies skipping and numbering in chain order', () => {
    expect(
      Iter.from([1, 2, 3, 4, 5])
        .filter((value) => value % 2 === 1)
        .skip(1)
        .enumerate()
        .map(([index, value]) => `${index}:${value}`)
        .take(2)
        .collect()
    ).toEqual(['0:3', '1:5'])
    expect(Iter.from(['a', 'b', 'c']).enumerate().skip(1).collect()).toEqual([
      [1, 'b'],
      [2, 'c'],
    ])
  })

  it('closes through the new adapters when a loop breaks', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
        yield 3
      } finally {
        closed++
      }
    }
    const source = Iter.from(values())
    const iter = source.skip(1).enumerate()
    const seen: [number, number][] = []

    for (const value of iter) {
      seen.push(value)
      break
    }
    expect(seen).toEqual([[0, 2]])
    expect(closed).toBe(1)
    iter.return()
    expect(closed).toBe(1)
    expect(source.collect()).toEqual([])
  })

  it('does not initialize a source when a derived chain is unused or closed', () => {
    let initialized = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return [1, 2][Symbol.iterator]()
      },
    }
    const source = Iter.from(values)
    const iter = source.skip(2).enumerate()

    expect(iter.take(0).collect()).toEqual([])
    iter.return()
    expect(iter.collect()).toEqual([])
    expect(source.collect()).toEqual([])
    expect(initialized).toBe(0)
  })

  it('allows explicit cleanup after a take limit through both adapters', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
        yield 3
      } finally {
        closed++
      }
    }
    const source = Iter.from(values())
    const iter = source.skip(1).enumerate().take(1)

    expect(iter.collect()).toEqual([[0, 2]])
    expect(closed).toBe(0)
    iter.return()
    expect(closed).toBe(1)
    expect(source.collect()).toEqual([])
  })

  it.each([0, 1])(
    'preserves source errors and closes once with skip(%i)',
    (count) => {
      const error = new Error('source failed')
      let closed = 0
      const values: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next() {
              throw error
            },
            return() {
              closed++
              throw new Error('cleanup failed')
            },
          }
        },
      }
      const source = Iter.from(values)
      const iter = source.skip(count).enumerate()

      expect(() => iter.next()).toThrow(error)
      expect(iter.collect()).toEqual([])
      expect(source.collect()).toEqual([])
      iter.return()
      expect(closed).toBe(1)
    }
  )
})
