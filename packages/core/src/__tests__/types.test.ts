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

it('narrows Option and Result branches with type guards', () => {
  const option: Option<number> = Some(1)
  const result: Result<number, string> = Ok(1)

  if (option.isSome()) {
    expectTypeOf(option.kind).toEqualTypeOf<'some'>()
    expectTypeOf(option.unwrap()).toEqualTypeOf<number>()
  }

  if (option.isNone()) {
    expectTypeOf(option.kind).toEqualTypeOf<'none'>()
  }

  const filtered = Option.fromNullable<number | undefined>(1).filter(
    (value): value is 1 => value === 1
  )
  expectTypeOf(filtered).toEqualTypeOf<Option<1>>()

  if (result.isOk()) {
    expectTypeOf(result.kind).toEqualTypeOf<'ok'>()
    expectTypeOf(result.unwrap()).toEqualTypeOf<number>()
  }

  if (result.isErr()) {
    expectTypeOf(result.kind).toEqualTypeOf<'err'>()
    expectTypeOf(result.unwrapErr()).toEqualTypeOf<string>()
  }
})
