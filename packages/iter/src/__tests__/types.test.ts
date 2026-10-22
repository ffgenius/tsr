import type { Option } from '@tsr/core'

import { expectTypeOf, test } from 'vite-plus/test'

import { Iter } from '../index.js'

test('infers mapped and filtered value types', () => {
  const strings = Iter.from([1, 2, 3])
    .map(String)
    .filter((value) => value.length > 0)
    .take(2)
    .collect()

  expectTypeOf(strings).toEqualTypeOf<string[]>()

  const numbers = Iter.from([1, 'two', 3] as (number | string)[])
    .filter((value): value is number => typeof value === 'number')
    .collect()

  expectTypeOf(numbers).toEqualTypeOf<number[]>()
})

test('accepts standard iterable inputs', () => {
  const values = Iter.from(new Set(['one', 'two'])).collect()

  expectTypeOf(values).toEqualTypeOf<string[]>()

  expectTypeOf(Iter.from([1, 'two'] as const).collect()).toEqualTypeOf<
    (1 | 'two')[]
  >()
  expectTypeOf(Iter.from(new Map([['one', 1]])).collect()).toEqualTypeOf<
    [string, number][]
  >()
  expectTypeOf(Iter.from('text').collect()).toEqualTypeOf<string[]>()
  expectTypeOf(Iter.from(new Uint8Array([1, 2])).collect()).toEqualTypeOf<
    number[]
  >()

  function* valuesGenerator() {
    yield 1
    yield 2
  }
  const custom: Iterable<boolean> = {
    *[Symbol.iterator]() {
      yield true
    },
  }

  expectTypeOf(Iter.from(valuesGenerator()).collect()).toEqualTypeOf<
    (1 | 2)[]
  >()
  expectTypeOf(Iter.from(custom).collect()).toEqualTypeOf<boolean[]>()
  expectTypeOf(Iter.from(Iter.from([1, 2])).collect()).toEqualTypeOf<number[]>()
})

test('requires synchronous iterable inputs', () => {
  type Input = Parameters<typeof Iter.from>[0]

  expectTypeOf<{ value: number }>().not.toExtend<Input>()
  expectTypeOf<Iterator<number>>().not.toExtend<Input>()
  expectTypeOf<Promise<number[]>>().not.toExtend<Input>()
  expectTypeOf<AsyncIterable<number>>().not.toExtend<Input>()
})

test('infers find results and narrows them with type guards', () => {
  const values: (number | string)[] = [1, 'two', 3]

  expectTypeOf(Iter.from(values).find(() => true)).toEqualTypeOf<
    Option<number | string>
  >()
  expectTypeOf(
    Iter.from(values).find(
      (value): value is number => typeof value === 'number'
    )
  ).toEqualTypeOf<Option<number>>()
  expectTypeOf(
    Iter.from(values).find((value) => typeof value === 'string')
  ).toEqualTypeOf<Option<string>>()
  expectTypeOf(Iter.from([1, 2] as const).find(() => true)).toEqualTypeOf<
    Option<1 | 2>
  >()
  expectTypeOf(Iter.from([undefined]).find(() => true)).toEqualTypeOf<
    Option<undefined>
  >()
  expectTypeOf(Iter.from([]).find(() => true)).toEqualTypeOf<Option<never>>()
})

test('infers predicates after adapters and returns booleans for any and all', () => {
  const iter = Iter.from([1, 2]).map(String)
  const found = iter.find((value) => {
    expectTypeOf(value).toEqualTypeOf<string>()
    return value.length > 0
  })

  expectTypeOf(found).toEqualTypeOf<Option<string>>()
  expectTypeOf(iter.any((value) => value.length > 0)).toEqualTypeOf<boolean>()
  expectTypeOf(iter.all((value) => value.length > 0)).toEqualTypeOf<boolean>()
})
