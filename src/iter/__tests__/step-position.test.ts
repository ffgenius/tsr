import { describe, expect, it } from 'vite-plus/test'

import { Iter } from '../index.js'

describe('stepBy', () => {
  it('defers reads and skips until the next value is requested', () => {
    let initialized = 0
    let reads = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return {
          next() {
            if (++reads > 7) {
              throw new Error('Read past the take limit')
            }
            return { done: false, value: reads }
          },
        }
      },
    }
    const iter = Iter.from(values).stepBy(3)

    expect(iter.take(0).collect()).toEqual([])
    expect([initialized, reads]).toEqual([0, 0])
    expect(iter.next()).toEqual({ done: false, value: 1 })
    expect([initialized, reads]).toEqual([1, 1])
    expect(iter.take(2).collect()).toEqual([4, 7])
    expect(reads).toBe(7)
    iter.return()
  })

  it('handles unit and oversized steps, empty inputs, and undefined elements', () => {
    expect(Iter.from([undefined, 0, false, '']).stepBy(1).collect()).toEqual([
      undefined,
      0,
      false,
      '',
    ])
    expect(Iter.from([1, 2]).stepBy(10).collect()).toEqual([1])
    expect(Iter.from([1, 2, 3, 4]).stepBy(2).collect()).toEqual([1, 3])
    expect(Iter.from([]).stepBy(2).collect()).toEqual([])
  })

  it.each([0, -0, -1, 1.5, Number.NaN, Infinity, -Infinity])(
    'rejects step %s without initializing or consuming the source',
    (count) => {
      let initialized = 0
      const values: Iterable<number> = {
        [Symbol.iterator]() {
          initialized++
          return [1, 2][Symbol.iterator]()
        },
      }
      const source = Iter.from(values)

      expect(() => source.stepBy(count)).toThrow(
        new RangeError('Iter.stepBy() requires a positive integer')
      )
      expect(initialized).toBe(0)
      expect(source.collect()).toEqual([1, 2])
    }
  )

  it('steps from the shared current position across partial consumption', () => {
    const source = Iter.from([0, 1, 2, 3, 4, 5, 6, 7])
    const iter = source.stepBy(2)
    source.next()

    expect(iter.next()).toEqual({ done: false, value: 1 })
    expect(source.next()).toEqual({ done: false, value: 2 })
    expect(iter.next()).toEqual({ done: false, value: 4 })
    expect(iter.collect()).toEqual([6])
    expect(iter.collect()).toEqual([])
  })

  it('applies the step at its position in a composed chain', () => {
    expect(
      Iter.from([1, 2, 3, 4, 5, 6])
        .filter((value) => value % 2 === 0)
        .stepBy(2)
        .enumerate()
        .map(([index, value]) => `${index}:${value}`)
        .collect()
    ).toEqual(['0:2', '1:6'])
  })

  it('closes an unused view without initializing the source', () => {
    let initialized = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return [1][Symbol.iterator]()
      },
    }
    const iter = Iter.from(values).stepBy(2)

    iter.return()
    expect(iter.collect()).toEqual([])
    expect(initialized).toBe(0)
  })

  it('retains upstream progress and explicit cleanup after a take limit', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
        yield 3
        yield 4
      } finally {
        closed++
      }
    }
    const source = Iter.from(values())
    const iter = source.stepBy(2).take(2)

    expect(iter.collect()).toEqual([1, 3])
    expect(closed).toBe(0)
    expect(source.next()).toEqual({ done: false, value: 4 })
    iter.return()
    iter.return()
    expect(closed).toBe(1)
  })

  it('closes the source once when a loop breaks', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
      } finally {
        closed++
      }
    }
    const iter = Iter.from(values()).stepBy(2)
    const seen: number[] = []

    for (const value of iter) {
      seen.push(value)
      break
    }
    expect(seen).toEqual([1])
    expect(closed).toBe(1)
    iter.return()
    expect(closed).toBe(1)
  })

  it.each([1, 2, 3])(
    'preserves a source error on read %i, including skipped reads',
    (failAt) => {
      const error = new Error('Source failed')
      let reads = 0
      let closed = 0
      const values: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next() {
              if (++reads === failAt) {
                throw error
              }
              return { done: false, value: reads }
            },
            return() {
              closed++
              throw new Error('Cleanup failed')
            },
          }
        },
      }
      const source = Iter.from(values)
      const iter = source.stepBy(2)

      expect(() => iter.collect()).toThrow(error)
      expect(closed).toBe(1)
      expect(iter.collect()).toEqual([])
      expect(source.collect()).toEqual([])
      iter.return()
      expect(closed).toBe(1)
    }
  )
})

describe('position', () => {
  it('returns a local index and resets it on each search without closing the source', () => {
    let closed = 0
    function* values() {
      try {
        yield 0
        yield 1
        yield 2
        yield 3
        yield 4
      } finally {
        closed++
      }
    }
    const source = Iter.from(values())
    source.next()
    const visited: number[] = []

    expect(
      source
        .position((value) => {
          visited.push(value)
          return value === 2
        })
        .unwrap()
    ).toBe(1)
    expect(visited).toEqual([1, 2])
    expect(source.position((value) => value === 3).unwrap()).toBe(0)
    expect(closed).toBe(0)
    expect(source.collect()).toEqual([4])
    expect(closed).toBe(1)
  })

  it('counts the output of adapters and short-circuits an infinite source', () => {
    let reads = 0
    function* values() {
      while (true) {
        if (++reads > 5) {
          throw new Error('Read past the match')
        }
        yield reads
      }
    }
    const iter = Iter.from(values()).stepBy(2)

    expect(iter.position((value) => value === 5).unwrap()).toBe(2)
    expect(reads).toBe(5)
    iter.return()
  })

  it('returns Some(0) for matched undefined and None for no match', () => {
    const source = Iter.from([undefined, 0, false, ''])

    expect(source.position((value) => value === undefined).unwrap()).toBe(0)
    expect(source.position(() => false).isNone()).toBe(true)
    expect(source.collect()).toEqual([])
  })

  it('does not call the predicate on empty, exhausted, or closed sources', () => {
    const exhausted = Iter.from([1])
    exhausted.collect()
    const closed = Iter.from([1])
    closed.return()
    let calls = 0
    const results = [Iter.from<number>([]), exhausted, closed].map((source) =>
      source
        .position(() => {
          calls++
          return true
        })
        .isNone()
    )

    expect(results).toEqual([true, true, true])
    expect(calls).toBe(0)
  })

  it.each(['source', 'predicate'] as const)(
    'preserves a %s error even when cleanup throws',
    (side) => {
      const error = new Error(`${side} failed`)
      let closed = 0
      const values: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next() {
              if (side === 'source') {
                throw error
              }
              return { done: false, value: 1 }
            },
            return() {
              closed++
              throw new Error('Cleanup failed')
            },
          }
        },
      }
      const source = Iter.from(values)
      const sibling = source.map(String)
      const iter = source.stepBy(2)

      expect(() =>
        iter.position(() => {
          throw error
        })
      ).toThrow(error)
      expect(closed).toBe(1)
      expect(iter.collect()).toEqual([])
      expect(sibling.collect()).toEqual([])
      iter.return()
      expect(closed).toBe(1)
    }
  )
})
