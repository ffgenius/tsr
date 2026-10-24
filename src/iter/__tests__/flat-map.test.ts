import { describe, expect, it } from 'vite-plus/test'

import { Iter } from '../index.js'

describe('flatMap and flatten', () => {
  it('defers initialization and reads only requested inner values', () => {
    const events: string[] = []
    function* outer() {
      events.push('outer')
      yield 1
      throw new Error('Outer read ahead')
    }
    function* inner(value: number) {
      events.push('inner')
      yield value
      yield value + 1
      throw new Error('Inner read ahead')
    }
    const iter = Iter.from(outer()).flatMap((value) => {
      events.push('mapper')
      return inner(value)
    })

    expect(events).toEqual([])
    expect(iter.take(0).collect()).toEqual([])
    expect(events).toEqual([])
    expect(iter.take(2).collect()).toEqual([1, 2])
    expect(events).toEqual(['outer', 'mapper', 'inner'])
    iter.return()
  })

  it('skips empty inner iterables and expands one level in order', () => {
    expect(
      Iter.from([0, 1, 2])
        .flatMap((value) => (value === 0 ? [] : [value, -value]))
        .collect()
    ).toEqual([1, -1, 2, -2])
    expect(
      Iter.from([[], [undefined], [], [null, false, 0, '']])
        .flatten()
        .collect()
    ).toEqual([undefined, null, false, 0, ''])
    expect(
      Iter.from([[[1]], [[2, 3]]])
        .flatten()
        .collect()
    ).toEqual([[1], [2, 3]])
    expect(Iter.from<Iterable<number>>([]).flatten().collect()).toEqual([])
    expect(Iter.from([[], []]).flatten().collect()).toEqual([])
  })

  it('accepts strings, sets, maps, typed arrays, and Iter instances', () => {
    const values: Iterable<unknown>[] = [
      'a😀',
      new Set([1, 2]),
      new Map([['key', 3]]),
      new Uint8Array([4, 5]),
      Iter.from([6, 7]),
    ]

    expect(Iter.from(values).flatten().collect()).toEqual([
      'a',
      '😀',
      1,
      2,
      ['key', 3],
      4,
      5,
      6,
      7,
    ])
  })

  it('resumes the active inner iterable across shared outer consumption', () => {
    const source = Iter.from([
      [1, 2, 3],
      [4, 5],
      [6, 7],
    ])
    const iter = source.flatten()

    expect(iter.next()).toEqual({ done: false, value: 1 })
    expect(source.next()).toEqual({ done: false, value: [4, 5] })
    expect(iter.take(2).collect()).toEqual([2, 3])
    expect(iter.collect()).toEqual([6, 7])
    expect(iter.collect()).toEqual([])
    expect(source.collect()).toEqual([])
  })

  it('composes with filtering and enumeration over an infinite outer source', () => {
    let reads = 0
    function* outer() {
      while (true) {
        if (++reads > 3) {
          throw new Error('Outer read ahead')
        }
        yield reads
      }
    }
    const iter = Iter.from(outer())
      .flatMap((value) => [value, value * 10])
      .filter((value) => value >= 10)
      .skip(1)
      .enumerate()
      .take(2)

    expect(iter.collect()).toEqual([
      [0, 20],
      [1, 30],
    ])
    expect(reads).toBe(3)
    iter.return()
  })

  it('continues within the active inner after short-circuit searches', () => {
    const iter = Iter.from([
      [1, 2, 3],
      [4, 5],
    ]).flatten()

    expect(iter.find((value) => value === 2).unwrap()).toBe(2)
    expect(iter.any((value) => value === 3)).toBe(true)
    expect(iter.collect()).toEqual([4, 5])
  })

  it('closes inner and outer when a downstream callback throws', () => {
    const closed: string[] = []
    function* inner() {
      try {
        yield 1
        yield 2
      } finally {
        closed.push('inner')
      }
    }
    function* outer() {
      try {
        yield inner()
      } finally {
        closed.push('outer')
      }
    }
    const error = new Error('Downstream failed')
    const iter = Iter.from(outer())
      .flatten()
      .map(() => {
        throw error
      })

    expect(() => iter.collect()).toThrow(error)
    expect(closed).toEqual(['inner', 'outer'])
  })

  it('does not initialize or map an unused, exhausted, or closed outer source', () => {
    let initialized = 0
    let calls = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return [1][Symbol.iterator]()
      },
    }
    const unused = Iter.from(values).flatMap((value) => {
      calls++
      return [value]
    })
    unused.return()
    expect(unused.collect()).toEqual([])
    expect(initialized).toBe(0)

    const exhausted = Iter.from([1])
    exhausted.collect()
    const closed = Iter.from([1])
    closed.return()
    for (const source of [Iter.from<number>([]), exhausted, closed]) {
      expect(
        source
          .flatMap((value) => {
            calls++
            return [value]
          })
          .collect()
      ).toEqual([])
    }
    expect(calls).toBe(0)
  })

  it.each(['return', 'break', 'throw'] as const)(
    'closes the active inner before the outer on %s, exactly once',
    (mode) => {
      const closed: string[] = []
      function* inner() {
        try {
          yield 1
          yield 2
        } finally {
          closed.push('inner')
        }
      }
      function* outer() {
        try {
          yield inner()
          yield [3]
        } finally {
          closed.push('outer')
        }
      }
      const source = Iter.from(outer())
      const iter = source.flatten()
      const error = new Error('consumer failed')
      const seen: number[] = []
      const run = () => {
        for (const value of iter) {
          seen.push(value)
          if (mode === 'throw') {
            throw error
          }
          if (mode === 'return') {
            return
          }
          break
        }
      }

      let caught: unknown
      try {
        run()
      } catch (error) {
        caught = error
      }
      expect(caught).toBe(mode === 'throw' ? error : undefined)
      expect(seen).toEqual([1])
      expect(closed).toEqual(['inner', 'outer'])
      iter.return()
      expect(closed).toEqual(['inner', 'outer'])
      expect(source.collect()).toEqual([])
    }
  )

  it('keeps both iterators open at a take limit and closes them explicitly', () => {
    const closed: string[] = []
    function* inner() {
      try {
        let value = 0
        while (true) {
          if (++value > 2) {
            throw new Error('Inner read ahead')
          }
          yield value
        }
      } finally {
        closed.push('inner')
      }
    }
    function* outer() {
      try {
        yield inner()
        throw new Error('Outer read ahead')
      } finally {
        closed.push('outer')
      }
    }
    const iter = Iter.from(outer()).flatten().take(2)

    expect(iter.collect()).toEqual([1, 2])
    expect(closed).toEqual([])
    iter.return()
    expect(closed).toEqual(['inner', 'outer'])
  })

  it('finishes generators normally without returning exhausted inner iterators', () => {
    let returned = 0
    const empty: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next: () => ({ done: true, value: undefined }),
          return() {
            returned++
            return { done: true, value: undefined }
          },
        }
      },
    }
    const closed: string[] = []
    function* inner() {
      try {
        yield 1
      } finally {
        closed.push('inner')
      }
    }
    function* outer() {
      try {
        yield empty
        yield inner()
      } finally {
        closed.push('outer')
      }
    }
    const iter = Iter.from(outer()).flatten()

    expect(iter.collect()).toEqual([1])
    expect(closed).toEqual(['inner', 'outer'])
    iter.return()
    expect(returned).toBe(0)
    expect(closed).toEqual(['inner', 'outer'])
  })

  it.each(['mapper', 'outer', 'acquire', 'inner'] as const)(
    'preserves a %s error when both cleanup operations can fail',
    (stage) => {
      const error = new Error(`${stage} failed`)
      const closed: string[] = []
      const inner: Iterable<number> = {
        [Symbol.iterator]() {
          if (stage === 'acquire') {
            throw error
          }
          return {
            next() {
              throw error
            },
            return() {
              closed.push('inner')
              throw new Error('Inner cleanup failed')
            },
          }
        },
      }
      const outer: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next() {
              if (stage === 'outer') {
                throw error
              }
              return { done: false, value: 1 }
            },
            return() {
              closed.push('outer')
              throw new Error('Outer cleanup failed')
            },
          }
        },
      }
      const source = Iter.from(outer)
      const iter = source.flatMap(() => {
        if (stage === 'mapper') {
          throw error
        }
        return inner
      })

      expect(() => iter.next()).toThrow(error)
      expect(closed).toEqual(stage === 'inner' ? ['inner', 'outer'] : ['outer'])
      iter.return()
      expect(iter.collect()).toEqual([])
      expect(source.collect()).toEqual([])
      expect(closed).toHaveLength(stage === 'inner' ? 2 : 1)
    }
  )

  it('closes the outer even if explicit inner cleanup throws, preserving the first error', () => {
    const error = new Error('Inner cleanup failed')
    const closed: string[] = []
    const inner: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next: () => ({ done: false, value: 1 }),
          return() {
            closed.push('inner')
            throw error
          },
        }
      },
    }
    const outer: Iterable<Iterable<number>> = {
      [Symbol.iterator]() {
        return {
          next: () => ({ done: false, value: inner }),
          return() {
            closed.push('outer')
            throw new Error('Outer cleanup failed')
          },
        }
      },
    }
    const iter = Iter.from(outer).flatten()

    expect(iter.next()).toEqual({ done: false, value: 1 })
    expect(() => iter.return()).toThrow(error)
    expect(closed).toEqual(['inner', 'outer'])
    iter.return()
    expect(iter.collect()).toEqual([])
    expect(closed).toEqual(['inner', 'outer'])
  })
})
