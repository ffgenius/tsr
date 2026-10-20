import { describe, expect, it } from 'vite-plus/test'

import { None, Option, OptionUnwrapError, Some } from '../index.js'

describe('Option', () => {
  it('keeps Some(undefined) distinct from None', () => {
    const some = Some(undefined)

    expect(some.isSome()).toBe(true)
    expect(some.unwrap()).toBeUndefined()
    expect(some.isNone()).toBe(false)
    expect(None).toBe(Option.none())
  })

  it('maps and chains only present values', () => {
    expect(
      Option.some(2)
        .map((value) => value * 2)
        .unwrap()
    ).toBe(4)
    expect(
      Option.some(2)
        .andThen((value) => Some(String(value)))
        .unwrap()
    ).toBe('2')
    expect(
      Option.none<number>()
        .map((value) => value * 2)
        .isNone()
    ).toBe(true)
  })

  it('filters, zips, and converts nullable values', () => {
    expect(
      Option.some(2)
        .filter((value) => value > 1)
        .unwrap()
    ).toBe(2)
    expect(Option.some(2).zip(Some('two')).unwrap()).toEqual([2, 'two'])
    expect(Option.fromNullable(0).unwrap()).toBe(0)
    expect(Option.fromNullable(null).isNone()).toBe(true)
    expect(Some(Some(1)).flatten().unwrap()).toBe(1)
  })

  it('evaluates fallback lazily and throws a descriptive error', () => {
    let calls = 0
    const some = Option.some(1).unwrapOrElse(() => ++calls)
    const none = Option.none<number>().unwrapOrElse(() => ++calls)

    expect([some, none, calls]).toEqual([1, 1, 1])
    expect(() => Option.none().expect('missing value')).toThrow(
      OptionUnwrapError
    )
  })
})
