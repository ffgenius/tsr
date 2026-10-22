import { Option } from '@tsr/core'
import { describe, expect, it } from 'vite-plus/test'

import { Iter } from '../index.js'

describe('short-circuit operations', () => {
  it('finds the first match from the current position and preserves the remainder', () => {
    const iter = Iter.from([0, 1, 2, 3, 4])
    const visited: number[] = []
    iter.next()

    const found = iter.find((value) => {
      visited.push(value)
      return value % 2 === 0
    })

    expect(found).toBeInstanceOf(Option)
    expect(found.unwrap()).toBe(2)
    expect(visited).toEqual([1, 2])
    expect(iter.collect()).toEqual([3, 4])
  })

  it('distinguishes a matched undefined value from no match', () => {
    const iter = Iter.from([undefined, 1])
    const found = iter.find((value) => value === undefined)

    expect(found.isSome()).toBe(true)
    expect(found.unwrap()).toBeUndefined()
    expect(iter.find(() => false).isNone()).toBe(true)
    expect(iter.collect()).toEqual([])
  })

  it('short-circuits any at the first match', () => {
    const iter = Iter.from([1, 2, 3])
    const visited: number[] = []

    expect(
      iter.any((value) => {
        visited.push(value)
        return value === 2
      })
    ).toBe(true)
    expect(visited).toEqual([1, 2])
    expect(iter.collect()).toEqual([3])
  })

  it('short-circuits all at the first failure', () => {
    const iter = Iter.from([1, 2, 3])
    const visited: number[] = []

    expect(
      iter.all((value) => {
        visited.push(value)
        return value < 2
      })
    ).toBe(false)
    expect(visited).toEqual([1, 2])
    expect(iter.collect()).toEqual([3])
  })

  it('handles empty, exhausted, and closed inputs without calling predicates', () => {
    const exhausted = Iter.from([1])
    exhausted.collect()
    const closed = Iter.from([1])
    closed.return()
    let calls = 0
    const predicate = () => {
      calls++
      return true
    }

    for (const iter of [Iter.from<number>([]), exhausted, closed]) {
      expect(iter.find(predicate).isNone()).toBe(true)
      expect(iter.any(predicate)).toBe(false)
      expect(iter.all(predicate)).toBe(true)
    }
    expect(calls).toBe(0)
  })

  it('exhausts finite sources when no short-circuit result exists', () => {
    const missing = Iter.from([1, 2])
    expect(missing.find((value) => value > 2).isNone()).toBe(true)
    expect(missing.collect()).toEqual([])

    const none = Iter.from([1, 2])
    expect(none.any((value) => value > 2)).toBe(false)
    expect(none.collect()).toEqual([])

    const all = Iter.from([1, 2])
    expect(all.all((value) => value > 0)).toBe(true)
    expect(all.collect()).toEqual([])
  })

  it.each([
    ['find', 3],
    ['any', true],
    ['all', false],
  ] as const)(
    '%s short-circuits an infinite source without closing it',
    (method, expected) => {
      let reads = 0
      let closed = false
      function* values() {
        try {
          while (true) {
            if (++reads > 3) {
              throw new Error('Read past the short-circuit point')
            }
            yield reads
          }
        } finally {
          closed = true
        }
      }

      const source = Iter.from(values())
      const result =
        method === 'find'
          ? source.find((value) => value === 3).unwrap()
          : method === 'any'
            ? source.any((value) => value === 3)
            : source.all((value) => value < 3)

      expect(result).toBe(expected)
      expect(reads).toBe(3)
      expect(closed).toBe(false)
      source.return()
      expect(closed).toBe(true)
    }
  )

  it('composes with adapters and shares the source position', () => {
    const source = Iter.from([1, 2, 3, 4, 5])
    const iter = source
      .map((value) => value * 10)
      .filter((value) => value > 10)
      .take(3)

    expect(iter.find((value) => value === 30).unwrap()).toBe(30)
    expect(source.next()).toEqual({ done: false, value: 4 })
    expect(iter.any((value) => value === 50)).toBe(true)
    expect(iter.all(() => false)).toBe(true)
    expect(source.collect()).toEqual([])
  })

  it.each(['find', 'any', 'all'] as const)(
    '%s preserves a predicate error even when cleanup throws',
    (method) => {
      const error = new Error('predicate failed')
      let closed = 0
      const values: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next: () => ({ done: false, value: 1 }),
            return() {
              closed++
              throw new Error('cleanup failed')
            },
          }
        },
      }

      const source = Iter.from(values)
      const sibling = source.map(String)
      const iter = source
        .map((value) => value * 2)
        .filter(() => true)
        .take(2)
      const predicate = (): boolean => {
        throw error
      }

      const run = () => {
        if (method === 'find') {
          return iter.find(predicate)
        }
        return iter[method](predicate)
      }
      expect(run).toThrow(error)
      expect(closed).toBe(1)
      expect(iter.collect()).toEqual([])
      expect(source.collect()).toEqual([])
      expect(sibling.collect()).toEqual([])
      iter.return()
      expect(closed).toBe(1)
    }
  )

  it.each(['find', 'any', 'all'] as const)(
    '%s propagates a source error and closes the source once',
    (method) => {
      const error = new Error('source failed')
      let closed = 0
      const source: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next() {
              throw error
            },
            return() {
              closed++
              return { done: true, value: undefined }
            },
          }
        },
      }
      const iter = Iter.from(source)
      const run = () => {
        if (method === 'find') {
          return iter.find(() => true)
        }
        return iter[method](() => true)
      }

      expect(run).toThrow(error)
      expect(iter.collect()).toEqual([])
      iter.return()
      expect(closed).toBe(1)
    }
  )
})
