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

  it('handles an empty source without calling adapters', () => {
    let calls = 0
    const iter = Iter.from<number>([])
      .map((value) => {
        calls++
        return value * 2
      })
      .filter(() => {
        calls++
        return true
      })
      .take(2)

    expect(iter.collect()).toEqual([])
    expect(calls).toBe(0)
  })

  it('consumes standard iterable inputs in their iteration order', () => {
    expect(Iter.from([1, 'two'] as const).collect()).toEqual([1, 'two'])
    expect(Iter.from(new Set([2, 1, 2])).collect()).toEqual([2, 1])
    expect(Iter.from(new Map([['one', 1]])).collect()).toEqual([['one', 1]])
    expect(Iter.from('你好😀').collect()).toEqual(['你', '好', '😀'])
    expect(Iter.from(new Uint8Array([1, 2])).collect()).toEqual([1, 2])
  })

  it('supports for-of consumption through natural generator completion', () => {
    let closed = false
    function* values() {
      try {
        yield 1
        yield 2
      } finally {
        closed = true
      }
    }

    const iter = Iter.from(values())
    const collected: number[] = []
    for (const value of iter) {
      collected.push(value)
    }

    expect(collected).toEqual([1, 2])
    expect(closed).toBe(true)
    expect(iter.collect()).toEqual([])
  })

  it('shares source progress between derived iterators', () => {
    const source = Iter.from([1, 2, 3, 4, 5])
    const mapped = source.map((value) => value * 10)
    const filtered = source.filter((value) => value % 2 === 0)

    expect(mapped.next()).toEqual({ done: false, value: 10 })
    expect(filtered.next()).toEqual({ done: false, value: 2 })
    expect(mapped.next()).toEqual({ done: false, value: 30 })
    expect(filtered.collect()).toEqual([4])
    expect(mapped.collect()).toEqual([])
    expect(source.collect()).toEqual([])
  })

  it('limits an infinite source while preserving its remaining progress', () => {
    let reads = 0
    function* values() {
      while (true) {
        reads++
        yield reads
      }
    }

    const source = Iter.from(values())
    expect(source.take(3).collect()).toEqual([1, 2, 3])
    expect(reads).toBe(3)
    expect(source.next()).toEqual({ done: false, value: 4 })
    source.return()
  })

  it('closes a generator through all adapters when a loop breaks', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
      } finally {
        closed++
      }
    }

    const source = Iter.from(values())
    const sibling = source.map(String)
    const iter = source
      .map((value) => value * 2)
      .filter(() => true)
      .take(2)

    for (const value of iter) {
      expect(value).toBe(2)
      break
    }

    expect(closed).toBe(1)
    expect(source.collect()).toEqual([])
    expect(sibling.collect()).toEqual([])
    expect(iter.collect()).toEqual([])
  })

  it('closes a generator when the loop body throws', () => {
    let closed = false
    const error = new Error('loop failed')
    function* values() {
      try {
        yield 1
        yield 2
      } finally {
        closed = true
      }
    }

    const iter = Iter.from(values())
    expect(() => {
      for (const value of iter) {
        expect(value).toBe(1)
        throw error
      }
    }).toThrow(error)
    expect(closed).toBe(true)
    expect(iter.collect()).toEqual([])
  })

  it.each(['map', 'filter'] as const)(
    'closes the source when a %s callback throws',
    (adapter) => {
      let closed = false
      const error = new Error('callback failed')
      function* values() {
        try {
          yield 1
          yield 2
        } finally {
          closed = true
        }
      }

      const source = Iter.from(values())
      const fail = (): never => {
        throw error
      }
      const iter = adapter === 'map' ? source.map(fail) : source.filter(fail)

      expect(() => iter.collect()).toThrow(error)
      expect(closed).toBe(true)
      expect(iter.collect()).toEqual([])
      expect(source.collect()).toEqual([])
    }
  )

  it('preserves iteration errors when closing the source also throws', () => {
    const error = new Error('iteration failed')
    let closes = 0
    const source: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next() {
            throw error
          },
          return() {
            closes++
            throw new Error('close failed')
          },
        }
      },
    }
    const iter = Iter.from(source)
      .map(String)
      .filter(() => true)
      .take(1)

    expect(() => iter.next()).toThrow(error)
    expect(iter.collect()).toEqual([])
    iter.return()
    expect(closes).toBe(1)
  })

  it('does not initialize a source when explicitly closed before consumption', () => {
    let initialized = 0
    const source: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return [1, 2][Symbol.iterator]()
      },
    }
    const iter = Iter.from(source)
      .map(String)
      .filter(() => true)
      .take(1)

    expect(iter.return()).toEqual({ done: true, value: undefined })
    expect(iter.collect()).toEqual([])
    expect(initialized).toBe(0)
  })

  it('allows explicit cleanup after a take limit is reached', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
      } finally {
        closed++
      }
    }

    const source = Iter.from(values())
    const limited = source.take(1)
    expect(limited.collect()).toEqual([1])
    expect(closed).toBe(0)
    limited.return()
    limited.return()
    expect(closed).toBe(1)
    expect(source.collect()).toEqual([])
  })

  it('propagates explicit cleanup errors once and remains closed', () => {
    const error = new Error('close failed')
    let closes = 0
    const source: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next: () => ({ done: false, value: 1 }),
          return() {
            closes++
            throw error
          },
        }
      },
    }
    const iter = Iter.from(source).map(String)

    iter.next()
    expect(() => iter.return()).toThrow(error)
    expect(iter.return()).toEqual({ done: true, value: undefined })
    expect(iter.collect()).toEqual([])
    expect(closes).toBe(1)
  })

  it('keeps completion latched even if a source later returns more values', () => {
    let reads = 0
    const source: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next() {
            reads++
            return reads === 1
              ? { done: true as const, value: undefined }
              : { done: false as const, value: reads }
          },
        }
      },
    }
    const iter = Iter.from(source)

    expect(iter.collect()).toEqual([])
    expect(iter.next()).toEqual({ done: true, value: undefined })
    expect(reads).toBe(1)
  })
})
