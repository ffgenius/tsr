import { expectTypeOf, test } from 'vite-plus/test'

import type {
  Bounded,
  FiniteNumber,
  Negative,
  NonEmptyArray,
  NonEmptyString,
  NonZero,
  Positive,
} from '../index.js'

import {
  bounded,
  finiteNumber,
  nonEmptyArray,
  nonEmptyString,
  nonZero,
  negative,
  positive,
  range,
} from '../index.js'

test('exposes iterable numeric ranges', () => {
  expectTypeOf(range.closed(1, 3)).toEqualTypeOf<Iterable<number>>()
  expectTypeOf(range.open(1, 3)).toEqualTypeOf<Iterable<number>>()
  expectTypeOf(range.closedOpen(1, 3)).toEqualTypeOf<Iterable<number>>()
  expectTypeOf(range.openClosed(1, 3)).toEqualTypeOf<Iterable<number>>()
})

test('returns branded types from validated constructors', () => {
  expectTypeOf(nonEmptyString('text').unwrap()).toEqualTypeOf<NonEmptyString>()
  expectTypeOf(nonEmptyArray([1]).unwrap()).toEqualTypeOf<
    NonEmptyArray<number>
  >()
  expectTypeOf(nonZero(1).unwrap()).toEqualTypeOf<NonZero>()
  expectTypeOf(positive(1).unwrap()).toEqualTypeOf<Positive>()
  expectTypeOf(negative(-1).unwrap()).toEqualTypeOf<Negative>()
  expectTypeOf(finiteNumber(1).unwrap()).toEqualTypeOf<FiniteNumber>()
  expectTypeOf(bounded(2, 1, 3).unwrap()).toEqualTypeOf<Bounded<1, 3>>()
})
