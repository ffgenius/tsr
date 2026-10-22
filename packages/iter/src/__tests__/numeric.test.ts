import { describe, expect, it } from 'vite-plus/test'

import { Iter } from '../index.js'

describe('numeric aggregations', () => {
  it.each([
    ['sum', 0, 9],
    ['product', 1, 24],
  ] as const)(
    '%s consumes only remaining values once',
    (method, identity, expected) => {
      const source = Iter.from([1, 2, 3, 4])
      source.next()

      expect(source[method]()).toBe(expected)
      expect(source[method]()).toBe(identity)
      expect(source.collect()).toEqual([])
    }
  )

  it.each([
    ['sum', 0],
    ['product', 1],
  ] as const)(
    '%s returns its identity for empty, exhausted, and closed sources',
    (method, identity) => {
      const exhausted = Iter.from([2])
      exhausted.collect()
      let initialized = 0
      const closed = Iter.from({
        *[Symbol.iterator]() {
          initialized++
          yield 2
        },
      })
      closed.return()

      expect(Iter.from<number>([])[method]()).toBe(identity)
      expect(exhausted[method]()).toBe(identity)
      expect(closed[method]()).toBe(identity)
      expect(initialized).toBe(0)
    }
  )

  it.each([
    ['sum', 10],
    ['product', 24],
  ] as const)(
    '%s composes lazily with adapters and respects take',
    (method, expected) => {
      let reads = 0
      let closed = 0
      function* values() {
        try {
          while (true) {
            yield ++reads
          }
        } finally {
          closed++
        }
      }
      const source = Iter.from(values())
      const limited = source
        .map((value) => value * 2)
        .filter((value) => value > 2)
        .take(2)

      expect(reads).toBe(0)
      expect(limited[method]()).toBe(expected)
      expect(reads).toBe(3)
      expect(closed).toBe(0)
      expect(source.next()).toEqual({ done: false, value: 4 })
      limited.return()
      expect(closed).toBe(1)
    }
  )

  it('uses ordered JavaScript addition and multiplication', () => {
    expect(Iter.from([1e16, 1, -1e16]).sum()).toBe(0)
    expect(Iter.from([1e16, -1e16, 1]).sum()).toBe(1)
    expect(Iter.from([0.1, 0.2]).sum()).toBe(0.1 + 0.2)
    expect(Iter.from([Number.MAX_VALUE, 2, 0]).product()).toBeNaN()
    expect(Iter.from([Number.MAX_VALUE, 0, 2]).product()).toBe(0)
    expect(Iter.from([Infinity, -Infinity]).sum()).toBeNaN()
    expect(Iter.from([Number.MAX_VALUE, Number.MAX_VALUE]).sum()).toBe(Infinity)
    expect(Iter.from([-0]).sum()).toBe(0)
    expect(Iter.from([-0, 2]).product()).toBe(-0)
  })

  it.each([
    ['sum', [NaN, 2, 3]],
    ['product', [0, 2, Infinity]],
  ] as const)('%s keeps consuming after NaN or zero', (method, values) => {
    const visited: number[] = []
    const source = Iter.from(values).inspect((value) => visited.push(value))

    expect(source[method]()).toBeNaN()
    expect(visited).toEqual(values)
    expect(source.collect()).toEqual([])
  })

  it.each(['sum', 'product'] as const)(
    '%s preserves a source error when cleanup also throws',
    (method) => {
      const error = new Error('source failed')
      let reads = 0
      let closed = 0
      const values: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next() {
              if (++reads === 1) {
                return { done: false, value: 2 }
              }
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

      expect(() => source[method]()).toThrow(error)
      expect(closed).toBe(1)
      expect(source.collect()).toEqual([])
      source.return()
      expect(closed).toBe(1)
    }
  )
})
