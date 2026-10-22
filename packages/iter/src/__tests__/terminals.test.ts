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

describe('fold', () => {
  it('folds remaining values in order and exhausts the source', () => {
    const source = Iter.from([1, 2, 3, 4])
    source.next()
    const visited: number[] = []
    const result = source.fold('start', (accumulator, value) => {
      visited.push(value)
      return `${accumulator}:${value}`
    })

    expect(result).toBe('start:2:3:4')
    expect(visited).toEqual([2, 3, 4])
    expect(source.collect()).toEqual([])
  })

  it('returns the initial value for empty, exhausted, or closed inputs', () => {
    const exhausted = Iter.from([1])
    exhausted.collect()
    const closed = Iter.from([1])
    closed.return()
    const initial = { total: 10 }
    let calls = 0

    for (const iter of [Iter.from<number>([]), exhausted, closed]) {
      expect(
        iter.fold(initial, (accumulator) => {
          calls++
          return accumulator
        })
      ).toBe(initial)
    }
    expect(calls).toBe(0)
  })

  it('composes with adapters and only consumes the bounded view', () => {
    let reads = 0
    let closed = false
    function* values() {
      try {
        while (true) {
          if (++reads > 5) {
            throw new Error('Read past the take limit')
          }
          yield reads
        }
      } finally {
        closed = true
      }
    }
    const source = Iter.from(values())
    const iter = source.skip(2).enumerate().take(2)

    expect(
      iter.fold(
        '',
        (accumulator, [index, value]) => `${accumulator}${index}:${value};`
      )
    ).toBe('0:3;1:4;')
    expect(reads).toBe(4)
    expect(closed).toBe(false)
    expect(source.next()).toEqual({ done: false, value: 5 })
    iter.return()
    expect(closed).toBe(true)
  })

  it('completes generator cleanup on normal exhaustion', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
      } finally {
        closed++
      }
    }

    expect(Iter.from(values()).fold(0, (sum, value) => sum + value)).toBe(3)
    expect(closed).toBe(1)
  })

  it('preserves reducer errors even when upstream cleanup throws', () => {
    const error = new Error('reducer failed')
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
    const iter = source.skip(1).enumerate().take(2)

    expect(() =>
      iter.fold(0, () => {
        throw error
      })
    ).toThrow(error)
    expect(closed).toBe(1)
    expect(iter.collect()).toEqual([])
    expect(source.collect()).toEqual([])
    expect(sibling.collect()).toEqual([])
    iter.return()
    expect(closed).toBe(1)
  })

  it('propagates source errors after partial accumulation and closes once', () => {
    const error = new Error('source failed')
    let closed = 0
    let reads = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next() {
            if (++reads > 1) {
              throw error
            }
            return { done: false, value: reads }
          },
          return() {
            closed++
            throw new Error('cleanup failed')
          },
        }
      },
    }
    const source = Iter.from(values)
    const visited: number[] = []

    expect(() =>
      source.fold(0, (sum, value) => {
        visited.push(value)
        return sum + value
      })
    ).toThrow(error)
    expect(visited).toEqual([1])
    expect(source.collect()).toEqual([])
    source.return()
    expect(closed).toBe(1)
  })
})

describe('reduce', () => {
  it('uses the first remaining value as the accumulator and reduces in order', () => {
    const source = Iter.from([10, 5, 2, 1])
    source.next()
    const calls: [number, number][] = []
    const result = source.reduce((accumulator, value) => {
      calls.push([accumulator, value])
      return accumulator - value
    })

    expect(result).toBeInstanceOf(Option)
    expect(result.unwrap()).toBe(2)
    expect(calls).toEqual([
      [5, 2],
      [3, 1],
    ])
    expect(source.collect()).toEqual([])
    expect(source.reduce((left, right) => left + right).isNone()).toBe(true)
  })

  it('returns None for empty, exhausted, or closed inputs without a callback', () => {
    const exhausted = Iter.from([1])
    exhausted.collect()
    const closed = Iter.from([1])
    closed.return()
    let calls = 0

    for (const source of [Iter.from<number>([]), exhausted, closed]) {
      expect(
        source
          .reduce((value) => {
            calls++
            return value
          })
          .isNone()
      ).toBe(true)
    }
    expect(calls).toBe(0)
  })

  it('returns a singleton unchanged, including undefined, without a callback', () => {
    let calls = 0
    const value = { count: 1 }
    const result = Iter.from([value]).reduce((accumulator) => {
      calls++
      return accumulator
    })
    const undefinedResult = Iter.from([undefined]).reduce(() => {
      calls++
      return undefined
    })

    expect(result.unwrap()).toBe(value)
    expect(undefinedResult.isSome()).toBe(true)
    expect(undefinedResult.unwrap()).toBeUndefined()
    expect(
      Iter.from([1, undefined])
        .reduce(() => undefined)
        .isSome()
    ).toBe(true)
    expect(calls).toBe(0)
  })

  it('composes with adapters and leaves the remainder of a bounded infinite source', () => {
    let reads = 0
    let closed = 0
    function* values() {
      try {
        while (true) {
          if (++reads > 5) {
            throw new Error('Read past the take limit')
          }
          yield reads
        }
      } finally {
        closed++
      }
    }
    const source = Iter.from(values())
    const seen: number[] = []
    const iter = source
      .filterMap((value) =>
        value % 2 === 0 ? Option.some(value * 10) : Option.none()
      )
      .inspect((value) => seen.push(value))
      .take(2)

    expect(iter.reduce((left, right) => left + right).unwrap()).toBe(60)
    expect(seen).toEqual([20, 40])
    expect(reads).toBe(4)
    expect(closed).toBe(0)
    expect(source.next()).toEqual({ done: false, value: 5 })
    iter.return()
    expect(closed).toBe(1)
  })

  it('completes generator cleanup on normal exhaustion', () => {
    let closed = 0
    function* values() {
      try {
        yield 1
        yield 2
      } finally {
        closed++
      }
    }

    expect(
      Iter.from<number>(values())
        .reduce((left, right) => left + right)
        .unwrap()
    ).toBe(3)
    expect(closed).toBe(1)
  })
})

describe('partition', () => {
  it('partitions remaining values in order and exhausts the source', () => {
    const source = Iter.from([1, 2, 3, 4, 5])
    source.next()
    const visited: number[] = []

    const result = source.partition((value) => {
      visited.push(value)
      return value % 2 === 0
    })

    expect(result).toEqual([
      [2, 4],
      [3, 5],
    ])
    expect(visited).toEqual([2, 3, 4, 5])
    expect(source.collect()).toEqual([])
  })

  it('returns empty groups without calling the predicate for empty or closed inputs', () => {
    const closed = Iter.from([1])
    closed.return()
    let calls = 0

    for (const source of [Iter.from<number>([]), closed]) {
      expect(
        source.partition(() => {
          calls++
          return true
        })
      ).toEqual([[], []])
    }
    expect(calls).toBe(0)
  })

  it('preserves a predicate error when source cleanup also throws', () => {
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

    expect(() =>
      source.partition(() => {
        throw error
      })
    ).toThrow(error)
    expect(closed).toBe(1)
    expect(source.collect()).toEqual([])
    source.return()
    expect(closed).toBe(1)
  })
})

describe('filterMap, inspect, and reduce errors', () => {
  it.each(['filterMap', 'inspect', 'reduce'] as const)(
    '%s preserves a callback error when cleanup also throws',
    (method) => {
      const error = new Error('callback failed')
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
      const iter = source.skip(1).take(3)
      const fail = (): never => {
        throw error
      }
      const run = () =>
        method === 'reduce' ? iter.reduce(fail) : iter[method](fail).collect()

      expect(run).toThrow(error)
      expect(iter.collect()).toEqual([])
      expect(source.collect()).toEqual([])
      expect(sibling.collect()).toEqual([])
      iter.return()
      expect(closed).toBe(1)
    }
  )

  it.each(['filterMap', 'inspect', 'reduce'] as const)(
    '%s preserves source errors and closes once',
    (method) => {
      const error = new Error('source failed')
      let closed = 0
      let reads = 0
      const values: Iterable<number> = {
        [Symbol.iterator]() {
          return {
            next() {
              if (++reads > 1) {
                throw error
              }
              return { done: false, value: 1 }
            },
            return() {
              closed++
              throw new Error('cleanup failed')
            },
          }
        },
      }
      const source = Iter.from(values)
      const run = () => {
        if (method === 'reduce') {
          return source.reduce((left, right) => left + right)
        }
        if (method === 'filterMap') {
          return source.filterMap(() => Option.none()).collect()
        }
        return source.inspect(() => {}).collect()
      }

      expect(run).toThrow(error)
      expect(source.collect()).toEqual([])
      source.return()
      expect(closed).toBe(1)
    }
  )
})
