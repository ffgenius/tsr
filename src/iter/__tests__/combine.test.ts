import { describe, expect, it } from 'vite-plus/test'

import { Iter } from '../index.js'

describe('chain', () => {
  it('initializes the second source only after the first is exhausted', () => {
    const events: string[] = []
    function* left() {
      events.push('left:1')
      yield 1
      events.push('left:2')
      yield 2
      events.push('left:done')
    }
    const right: Iterable<number> = {
      [Symbol.iterator]() {
        events.push('right')
        return [3, 4][Symbol.iterator]()
      },
    }
    const iter = Iter.from(left()).chain(right)

    expect(events).toEqual([])
    expect(iter.take(0).collect()).toEqual([])
    expect(events).toEqual([])
    expect(iter.take(2).collect()).toEqual([1, 2])
    expect(events).toEqual(['left:1', 'left:2'])
    expect(iter.next()).toEqual({ done: false, value: 3 })
    expect(events).toEqual(['left:1', 'left:2', 'left:done', 'right'])
    expect(iter.collect()).toEqual([4])
    expect(iter.collect()).toEqual([])
  })

  it('handles empty sources and preserves undefined and falsy elements', () => {
    expect(Iter.from([]).chain([]).collect()).toEqual([])
    expect(Iter.from([]).chain([1]).collect()).toEqual([1])
    expect(Iter.from([1]).chain([]).collect()).toEqual([1])
    expect(
      Iter.from([undefined, null]).chain([false, 0, '']).collect()
    ).toEqual([undefined, null, false, 0, ''])
    expect(
      Iter.from([1])
        .chain(new Set(['two']))
        .collect()
    ).toEqual([1, 'two'])
    expect(Iter.from([]).chain('a😀').collect()).toEqual(['a', '😀'])
  })

  it('shares the current positions of both Iter inputs', () => {
    const left = Iter.from([1, 2, 3])
    const right = Iter.from(['a', 'b', 'c'])
    left.next()
    right.next()
    const iter = left.chain(right)

    expect(iter.next()).toEqual({ done: false, value: 2 })
    expect(left.next()).toEqual({ done: false, value: 3 })
    expect(iter.next()).toEqual({ done: false, value: 'b' })
    expect(right.next()).toEqual({ done: false, value: 'c' })
    expect(iter.collect()).toEqual([])
  })

  it('never initializes the second source while the first remains infinite', () => {
    let reads = 0
    let initialized = 0
    function* left() {
      while (true) {
        if (++reads > 3) {
          throw new Error('Read past the take limit')
        }
        yield reads
      }
    }
    const right: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        throw new Error('Second source should not be initialized')
      },
    }
    const iter = Iter.from(left()).chain(right).take(3)

    expect(iter.collect()).toEqual([1, 2, 3])
    iter.return()
    expect(reads).toBe(3)
    expect(initialized).toBe(0)
  })
})

describe('zip', () => {
  it('lazily reads each pair from left to right without reading ahead', () => {
    const events: string[] = []
    function* values(label: string) {
      events.push(`${label}:1`)
      yield 1
      events.push(`${label}:2`)
      yield 2
      throw new Error('Read past the take limit')
    }
    const iter = Iter.from(values('left')).zip(values('right'))

    expect(events).toEqual([])
    expect(iter.take(0).collect()).toEqual([])
    expect(events).toEqual([])
    expect(iter.take(2).collect()).toEqual([
      [1, 1],
      [2, 2],
    ])
    expect(events).toEqual(['left:1', 'right:1', 'left:2', 'right:2'])
    iter.return()
  })

  it('leaves the right remainder when the left ends first', () => {
    const right = Iter.from(['a', 'b', 'c'])
    const iter = Iter.from([1]).zip(right)

    expect(iter.collect()).toEqual([[1, 'a']])
    expect(iter.collect()).toEqual([])
    expect(right.collect()).toEqual(['b', 'c'])
  })

  it('consumes one unmatched left element when the right ends first', () => {
    const left = Iter.from([1, 2, 3, 4])
    const iter = left.zip(['a'])

    expect(iter.collect()).toEqual([[1, 'a']])
    expect(iter.collect()).toEqual([])
    expect(left.collect()).toEqual([3, 4])
  })

  it('does not initialize the right when the left is empty', () => {
    let initialized = 0
    const right: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return [1][Symbol.iterator]()
      },
    }
    const iter = Iter.from([]).zip(right)

    expect(iter.collect()).toEqual([])
    iter.return()
    expect(initialized).toBe(0)
    const left = Iter.from([1, 2])
    expect(left.zip([]).collect()).toEqual([])
    expect(left.collect()).toEqual([2])
    expect(Iter.from([]).zip([]).collect()).toEqual([])
  })

  it('preserves undefined values and accepts other synchronous iterables', () => {
    expect(Iter.from([undefined]).zip([undefined]).collect()).toEqual([
      [undefined, undefined],
    ])
    expect(Iter.from([false, 0]).zip('a😀').collect()).toEqual([
      [false, 'a'],
      [0, '😀'],
    ])
    expect(
      Iter.from([1])
        .zip(new Map([['key', 2]]))
        .collect()
    ).toEqual([[1, ['key', 2]]])
  })

  it('shares both source positions and resumes after a short-circuit search', () => {
    const left = Iter.from([0, 1, 2, 3, 4])
    const right = Iter.from(['a', 'b', 'c', 'd', 'e'])
    left.next()
    right.next()
    const iter = left.zip(right)

    expect(iter.find(([value]) => value === 1).unwrap()).toEqual([1, 'b'])
    expect(left.next()).toEqual({ done: false, value: 2 })
    expect(right.next()).toEqual({ done: false, value: 'c' })
    expect(iter.collect()).toEqual([
      [3, 'd'],
      [4, 'e'],
    ])
    expect(iter.collect()).toEqual([])
  })

  it('bounds an infinite source with the shorter input', () => {
    let reads = 0
    function* left() {
      while (true) {
        if (++reads > 3) {
          throw new Error('Read after zip ended')
        }
        yield reads
      }
    }
    const iter = Iter.from(left()).zip(['a', 'b'])

    expect(iter.collect()).toEqual([
      [1, 'a'],
      [2, 'b'],
    ])
    expect(iter.collect()).toEqual([])
    expect(reads).toBe(3)
    iter.return()
  })
})

describe.each(['chain', 'zip'] as const)('%s resource handling', (method) => {
  it('closes an unused combination without initializing either source', () => {
    let initialized = 0
    const values: Iterable<number> = {
      [Symbol.iterator]() {
        initialized++
        return [1][Symbol.iterator]()
      },
    }
    const source = Iter.from(values)
    const iter = source[method](values)

    iter.return()
    expect(iter.collect()).toEqual([])
    expect(source.collect()).toEqual([])
    expect(initialized).toBe(0)
  })

  it('cleans up initialized sources on a break, without initializing unused ones', () => {
    const initialized: string[] = []
    const closed: string[] = []
    function* values(label: string) {
      initialized.push(label)
      try {
        yield 1
        yield 2
      } finally {
        closed.push(label)
      }
    }
    const iter = Iter.from(values('left'))[method](values('right'))
    const seen: unknown[] = []

    for (const value of iter) {
      seen.push(value)
      break
    }
    expect(seen).toHaveLength(1)
    expect(initialized).toEqual(
      method === 'chain' ? ['left'] : ['left', 'right']
    )
    expect(closed).toEqual(initialized)
    iter.return()
    expect(closed).toEqual(initialized)
  })

  it('retains cleanup after take reaches its limit', () => {
    const closed: string[] = []
    function* values(label: string) {
      try {
        yield 1
        yield 2
      } finally {
        closed.push(label)
      }
    }
    const iter = Iter.from(values('left'))[method](values('right')).take(3)

    iter.collect()
    expect(closed).toEqual(['left'])
    iter.return()
    expect(closed).toEqual(['left', 'right'])
    iter.return()
    expect(closed).toEqual(['left', 'right'])
  })

  it.each(['left', 'right'] as const)(
    'preserves a %s iteration error even if cleanup throws',
    (side) => {
      const error = new Error(`${side} failed`)
      const closed: string[] = []
      function values(label: string): Iterable<number> {
        return {
          [Symbol.iterator]() {
            let reads = 0
            return {
              next() {
                if (++reads > 1 && label === side) {
                  throw error
                }
                return reads > 1 && method === 'chain' && label === 'left'
                  ? { done: true, value: undefined }
                  : { done: false, value: 1 }
              },
              return() {
                closed.push(label)
                throw new Error(`${label} cleanup failed`)
              },
            }
          },
        }
      }
      const iter = Iter.from(values('left'))[method](values('right'))
      iter.next()
      const run = () => iter.collect()
      const expectedClosed =
        side === 'right'
          ? ['right', 'left']
          : method === 'chain'
            ? ['left']
            : ['left', 'right']

      expect(run).toThrow(error)
      expect(closed).toEqual(expectedClosed)
      iter.return()
      expect(closed).toEqual(expectedClosed)
      expect(iter.collect()).toEqual([])
    }
  )

  it('closes initialized sources when a downstream callback throws', () => {
    const closed: string[] = []
    const error = new Error('Callback failed')
    function* values(label: string) {
      try {
        yield 1
        if (label === 'right' || method === 'zip') {
          yield 2
          yield 3
        }
      } finally {
        closed.push(label)
      }
    }
    const iter = Iter.from(values('left'))[method](values('right'))
    iter.next()
    iter.next()
    const mapped = iter.map(() => {
      throw error
    })

    expect(() => mapped.next()).toThrow(error)
    expect(closed).toEqual(['left', 'right'])
    expect(iter.collect()).toEqual([])
    mapped.return()
    expect(closed).toEqual(['left', 'right'])
  })

  it('attempts both cleanups and preserves the first cleanup error', () => {
    const closed: string[] = []
    const error = new Error('Left cleanup failed')
    function values(label: string): Iterable<number> {
      return {
        [Symbol.iterator]() {
          let reads = 0
          return {
            next() {
              return ++reads > 1 && method === 'chain' && label === 'left'
                ? { done: true, value: undefined }
                : { done: false, value: 1 }
            },
            return() {
              closed.push(label)
              throw label === 'left' ? error : new Error('Right cleanup failed')
            },
          }
        },
      }
    }
    const iter = Iter.from(values('left'))[method](values('right'))
    iter.next()
    iter.next()

    expect(() => iter.return()).toThrow(error)
    expect(closed).toEqual(['left', 'right'])
    iter.return()
    expect(closed).toEqual(['left', 'right'])
    expect(iter.collect()).toEqual([])
  })

  it('preserves an error while acquiring the second iterator', () => {
    let closed = 0
    const error = new Error('Acquisition failed')
    const left: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next: () =>
            method === 'chain'
              ? { done: true, value: undefined }
              : { done: false, value: 1 },
          return() {
            closed++
            throw new Error('Cleanup failed')
          },
        }
      },
    }
    const right: Iterable<number> = {
      [Symbol.iterator]() {
        throw error
      },
    }
    const iter = Iter.from(left)[method](right)

    expect(() => iter.next()).toThrow(error)
    expect(closed).toBe(1)
    iter.return()
    expect(closed).toBe(1)
    expect(iter.collect()).toEqual([])
  })
})
