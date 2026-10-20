import { expectTypeOf, it } from 'vite-plus/test'

import { Err, Ok, Option, Result, Some } from '../index.js'

it('preserves Option and Result type inference', () => {
  expectTypeOf(Some(1).map(String)).toEqualTypeOf<Option<string>>()
  expectTypeOf(Ok(1).andThen((value) => Err(value.toString()))).toEqualTypeOf<
    Result<never, string>
  >()
  expectTypeOf(
    Ok(1).andThen((value) => (value > 0 ? Ok(value) : Err('bad')))
  ).toEqualTypeOf<Result<number, string>>()
})
