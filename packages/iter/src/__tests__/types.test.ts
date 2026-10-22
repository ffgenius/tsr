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

test('infers flatMap elements from synchronous iterable callbacks', () => {
  const strings = Iter.from([1, 2]).flatMap((value) => {
    expectTypeOf(value).toEqualTypeOf<number>()
    return new Set([String(value)])
  })
  expectTypeOf(strings).toEqualTypeOf<Iter<string>>()
  expectTypeOf(
    Iter.from([1, 'two'] as const)
      .flatMap((value) => [value] as const)
      .collect()
  ).toEqualTypeOf<(1 | 'two')[]>()
  expectTypeOf(
    Iter.from([1])
      .flatMap(() => [])
      .collect()
  ).toEqualTypeOf<never[]>()
  expectTypeOf(
    Iter.from([1])
      .flatMap(() => [undefined])
      .collect()
  ).toEqualTypeOf<undefined[]>()
  expectTypeOf(
    Iter.from([1])
      .flatMap(() => new Map([['key', 1]]))
      .collect()
  ).toEqualTypeOf<[string, number][]>()
  expectTypeOf(
    Iter.from([1])
      .flatMap((value) => Iter.from([value]))
      .collect()
  ).toEqualTypeOf<number[]>()
  expectTypeOf(
    Iter.from([true, false])
      .flatMap((value) => (value ? [1] : ['two']))
      .collect()
  ).toEqualTypeOf<(number | string)[]>()
})

test('infers flatten elements for readonly, nested, and mixed iterable inputs', () => {
  expectTypeOf(
    Iter.from([[1], ['two']] as const)
      .flatten()
      .collect()
  ).toEqualTypeOf<(1 | 'two')[]>()
  expectTypeOf(
    Iter.from([[[1]], [[2]]])
      .flatten()
      .collect()
  ).toEqualTypeOf<number[][]>()
  expectTypeOf(Iter.from(['text']).flatten().collect()).toEqualTypeOf<
    string[]
  >()
  expectTypeOf(
    Iter.from([new Uint8Array([1])])
      .flatten()
      .collect()
  ).toEqualTypeOf<number[]>()
  expectTypeOf(
    Iter.from([new Set(['one'])])
      .flatten()
      .collect()
  ).toEqualTypeOf<string[]>()
  expectTypeOf(
    Iter.from([new Map([['one', 1]])])
      .flatten()
      .collect()
  ).toEqualTypeOf<[string, number][]>()
  expectTypeOf(
    Iter.from([[], [undefined]])
      .flatten()
      .collect()
  ).toEqualTypeOf<undefined[]>()
  expectTypeOf(Iter.from([[], []]).flatten().collect()).toEqualTypeOf<never[]>()
  const mixed: Iterable<number | string>[] = [[1], new Set(['two'])]
  expectTypeOf(Iter.from(mixed).flatten().collect()).toEqualTypeOf<
    (number | string)[]
  >()
})

test('requires synchronous iterable results for flatMap and flatten', () => {
  type Output = ReturnType<Parameters<Iter<number>['flatMap']>[0]>
  type Receiver = ThisParameterType<Iter<number>['flatten']>

  expectTypeOf<number>().not.toExtend<Output>()
  expectTypeOf<Iterator<number>>().not.toExtend<Output>()
  expectTypeOf<Promise<number[]>>().not.toExtend<Output>()
  expectTypeOf<AsyncIterable<number>>().not.toExtend<Output>()
  expectTypeOf<Iter<number>>().not.toExtend<Receiver>()
  expectTypeOf<Iter<number | number[]>>().not.toExtend<Receiver>()
  expectTypeOf<Iter<AsyncIterable<number>>>().not.toExtend<Receiver>()
})

test('infers chain unions and preserves literal and empty input types', () => {
  expectTypeOf(Iter.from([1]).chain(new Set(['two']))).toEqualTypeOf<
    Iter<number | string>
  >()
  expectTypeOf(
    Iter.from([1] as const)
      .chain(['two', false] as const)
      .collect()
  ).toEqualTypeOf<(1 | 'two' | false)[]>()
  expectTypeOf(Iter.from([]).chain([1]).collect()).toEqualTypeOf<number[]>()
  expectTypeOf(Iter.from([1]).chain([]).collect()).toEqualTypeOf<number[]>()
  expectTypeOf(Iter.from([]).chain([]).collect()).toEqualTypeOf<never[]>()
  expectTypeOf(Iter.from([undefined]).chain([null]).collect()).toEqualTypeOf<
    (undefined | null)[]
  >()
})

test('infers zip tuples from readonly and nested iterable inputs', () => {
  expectTypeOf(Iter.from([1]).zip(['two'])).toEqualTypeOf<
    Iter<[number, string]>
  >()
  expectTypeOf(
    Iter.from([1, 2] as const)
      .zip(['one', 'two'] as const)
      .collect()
  ).toEqualTypeOf<[1 | 2, 'one' | 'two'][]>()
  expectTypeOf(
    Iter.from([true])
      .zip(new Map([['one', 1]]))
      .collect()
  ).toEqualTypeOf<[boolean, [string, number]][]>()
  expectTypeOf(Iter.from([undefined]).zip([null]).collect()).toEqualTypeOf<
    [undefined, null][]
  >()
  expectTypeOf(Iter.from([]).zip(['one']).collect()).toEqualTypeOf<
    [never, string][]
  >()
})

test('infers callbacks after combining and narrowing sources', () => {
  const values = Iter.from([1])
    .chain(['two'])
    .filter((value) => typeof value === 'string')
    .zip(Iter.from([true]))
    .map(([value, enabled]) => {
      expectTypeOf(value).toEqualTypeOf<string>()
      expectTypeOf(enabled).toEqualTypeOf<boolean>()
      return enabled ? value : ''
    })
    .collect()

  expectTypeOf(values).toEqualTypeOf<string[]>()
})

test('requires synchronous iterable inputs for chain and zip', () => {
  type ChainInput = Parameters<Iter<number>['chain']>[0]
  type ZipInput = Parameters<Iter<number>['zip']>[0]

  expectTypeOf<Iterator<number>>().not.toExtend<ChainInput>()
  expectTypeOf<Promise<number[]>>().not.toExtend<ChainInput>()
  expectTypeOf<AsyncIterable<number>>().not.toExtend<ChainInput>()
  expectTypeOf<Iterator<number>>().not.toExtend<ZipInput>()
  expectTypeOf<Promise<number[]>>().not.toExtend<ZipInput>()
  expectTypeOf<AsyncIterable<number>>().not.toExtend<ZipInput>()
})

test('preserves stepBy element types through literal, empty, and tuple inputs', () => {
  expectTypeOf(Iter.from([1, 'two'] as const).stepBy(2)).toEqualTypeOf<
    Iter<1 | 'two'>
  >()
  expectTypeOf(Iter.from([undefined]).stepBy(1).collect()).toEqualTypeOf<
    undefined[]
  >()
  expectTypeOf(Iter.from([]).stepBy(2).collect()).toEqualTypeOf<never[]>()
  expectTypeOf(
    Iter.from(new Map([['one', 1]]))
      .stepBy(2)
      .collect()
  ).toEqualTypeOf<[string, number][]>()
})

test('infers position predicates and always returns an optional numeric index', () => {
  const source = Iter.from([1, 'two'] as const)
  expectTypeOf(
    source.position((value) => {
      expectTypeOf(value).toEqualTypeOf<1 | 'two'>()
      return value === 'two'
    })
  ).toEqualTypeOf<Option<number>>()
  expectTypeOf(Iter.from([]).position(() => true)).toEqualTypeOf<
    Option<number>
  >()
  expectTypeOf(Iter.from([undefined]).position(() => true)).toEqualTypeOf<
    Option<number>
  >()

  const result = Iter.from([1, 'two'])
    .filter((value) => typeof value === 'string')
    .stepBy(2)
    .position((value) => {
      expectTypeOf(value).toEqualTypeOf<string>()
      return value.length > 0
    })
  expectTypeOf(result).toEqualTypeOf<Option<number>>()
})

test('returns numbers for numeric aggregations after mapping and narrowing', () => {
  expectTypeOf(Iter.from([1, 2] as const).sum()).toEqualTypeOf<number>()
  expectTypeOf(Iter.from([1, 2] as const).product()).toEqualTypeOf<number>()
  expectTypeOf(Iter.from([]).sum()).toEqualTypeOf<number>()
  expectTypeOf(Iter.from([]).product()).toEqualTypeOf<number>()
  expectTypeOf(Iter.from(['1', '2']).map(Number).sum()).toEqualTypeOf<number>()
  expectTypeOf(
    Iter.from([1, 'two', 3])
      .filter((value) => typeof value === 'number')
      .product()
  ).toEqualTypeOf<number>()
})

test('requires numeric elements for sum and product', () => {
  type SumReceiver = ThisParameterType<Iter<number>['sum']>
  type ProductReceiver = ThisParameterType<Iter<number>['product']>

  expectTypeOf<Iter<string>>().not.toExtend<SumReceiver>()
  expectTypeOf<Iter<number | string>>().not.toExtend<SumReceiver>()
  expectTypeOf<Iter<bigint>>().not.toExtend<SumReceiver>()
  expectTypeOf<Iter<undefined>>().not.toExtend<SumReceiver>()
  expectTypeOf<Iter<string>>().not.toExtend<ProductReceiver>()
  expectTypeOf<Iter<number | string>>().not.toExtend<ProductReceiver>()
  expectTypeOf<Iter<bigint>>().not.toExtend<ProductReceiver>()
  expectTypeOf<Iter<undefined>>().not.toExtend<ProductReceiver>()
})

test('infers partition groups and narrows type guards', () => {
  const values: (number | string)[] = [1, 'two']
  const [strings, numbers] = Iter.from(values).partition(
    (value): value is string => typeof value === 'string'
  )

  expectTypeOf(strings).toEqualTypeOf<string[]>()
  expectTypeOf(numbers).toEqualTypeOf<number[]>()
  expectTypeOf(Iter.from([1, 2]).partition((value) => value > 1)).toEqualTypeOf<
    [number[], number[]]
  >()
  expectTypeOf(Iter.from([]).partition(() => true)).toEqualTypeOf<
    [never[], never[]]
  >()
})
