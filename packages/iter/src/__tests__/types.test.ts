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
})
