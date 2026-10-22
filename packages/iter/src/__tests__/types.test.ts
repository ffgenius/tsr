import { Option } from '@tsr/core'
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

test('preserves element types through skip and tuple types through enumerate', () => {
  expectTypeOf(Iter.from([1, 'two'] as const).skip(1)).toEqualTypeOf<
    Iter<1 | 'two'>
  >()
  expectTypeOf(
    Iter.from([1, 'two'] as const)
      .enumerate()
      .collect()
  ).toEqualTypeOf<[number, 1 | 'two'][]>()
  expectTypeOf(Iter.from([undefined]).enumerate().collect()).toEqualTypeOf<
    [number, undefined][]
  >()
  expectTypeOf(Iter.from([]).enumerate().collect()).toEqualTypeOf<
    [number, never][]
  >()
  expectTypeOf(
    Iter.from(new Map([['one', 1]]))
      .enumerate()
      .collect()
  ).toEqualTypeOf<[number, [string, number]][]>()

  const result = Iter.from([1, 'two'])
    .filter((value) => typeof value === 'string')
    .skip(1)
    .enumerate()
    .map(([index, value]) => {
      expectTypeOf(index).toEqualTypeOf<number>()
      expectTypeOf(value).toEqualTypeOf<string>()
      return value
    })
    .collect()

  expectTypeOf(result).toEqualTypeOf<string[]>()
})

test('infers fold accumulators independently of element types', () => {
  const text = Iter.from([1, 2]).fold('', (accumulator, value) => {
    expectTypeOf(accumulator).toEqualTypeOf<string>()
    expectTypeOf(value).toEqualTypeOf<number>()
    return accumulator + value
  })
  expectTypeOf(text).toEqualTypeOf<string>()

  const summary = Iter.from([1, 2])
    .enumerate()
    .fold({ total: 0 }, (accumulator, [index, value]) => {
      expectTypeOf(accumulator).toEqualTypeOf<{ total: number }>()
      expectTypeOf(index).toEqualTypeOf<number>()
      expectTypeOf(value).toEqualTypeOf<number>()
      return { total: accumulator.total + index + value }
    })
  expectTypeOf(summary).toEqualTypeOf<{ total: number }>()

  const collected = Iter.from([1, 2]).fold<string[]>([], (values, value) => [
    ...values,
    String(value),
  ])
  expectTypeOf(collected).toEqualTypeOf<string[]>()
  expectTypeOf(Iter.from([]).fold(0, (total) => total)).toEqualTypeOf<number>()
})

test('infers filterMap output types from Option callbacks', () => {
  const numbers = Iter.from([1, 'two', 3]).filterMap((value) => {
    expectTypeOf(value).toEqualTypeOf<number | string>()
    return typeof value === 'number' ? Option.some(value) : Option.none()
  })
  expectTypeOf(numbers).toEqualTypeOf<Iter<number>>()
  expectTypeOf(numbers.collect()).toEqualTypeOf<number[]>()

  expectTypeOf(
    Iter.from([1, 'two'] as const)
      .filterMap(Option.some)
      .collect()
  ).toEqualTypeOf<(1 | 'two')[]>()
  expectTypeOf(
    Iter.from([1])
      .filterMap(() => Option.some(undefined))
      .collect()
  ).toEqualTypeOf<undefined[]>()
  expectTypeOf(
    Iter.from([1])
      .filterMap(() => Option.none())
      .collect()
  ).toEqualTypeOf<never[]>()
})

test('preserves types through inspect and infers chained callbacks', () => {
  const iter = Iter.from([1, 'two'] as const).inspect((value) => {
    expectTypeOf(value).toEqualTypeOf<1 | 'two'>()
    return true
  })
  expectTypeOf(iter).toEqualTypeOf<Iter<1 | 'two'>>()

  const result = Iter.from([1, 'two'])
    .filterMap((value) =>
      typeof value === 'string' ? Option.some(value) : Option.none()
    )
    .inspect((value) => {
      expectTypeOf(value).toEqualTypeOf<string>()
    })
    .enumerate()
    .map(([index, value]) => {
      expectTypeOf(index).toEqualTypeOf<number>()
      expectTypeOf(value).toEqualTypeOf<string>()
      return value
    })
    .collect()
  expectTypeOf(result).toEqualTypeOf<string[]>()
})

test('infers reduce results from the element type', () => {
  const result = Iter.from([1, 2]).reduce((accumulator, value) => {
    expectTypeOf(accumulator).toEqualTypeOf<number>()
    expectTypeOf(value).toEqualTypeOf<number>()
    return accumulator + value
  })
  expectTypeOf(result).toEqualTypeOf<Option<number>>()
  expectTypeOf(
    Iter.from([1, 'two'] as const).reduce((value) => value)
  ).toEqualTypeOf<Option<1 | 'two'>>()
  expectTypeOf(Iter.from([undefined]).reduce(() => undefined)).toEqualTypeOf<
    Option<undefined>
  >()
  expectTypeOf(Iter.from([]).reduce((value) => value)).toEqualTypeOf<
    Option<never>
  >()
  expectTypeOf(
    Iter.from([1, 2])
      .map(String)
      .reduce((left, right) => left + right)
  ).toEqualTypeOf<Option<string>>()
})
