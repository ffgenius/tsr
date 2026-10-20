import { describe, expect, it } from 'vite-plus/test'

import { Err, Ok, Option, ResultUnwrapError } from '../index.js'

describe('Result', () => {
  it('maps values and combines errors through andThen', () => {
    const result = Ok(2)
      .map((value) => value * 2)
      .andThen((value) => (value > 0 ? Ok(String(value)) : Err('negative')))

    expect(result.unwrap()).toBe('4')
    expect(
      Err('first')
        .andThen(() => Err('second'))
        .unwrapErr()
    ).toBe('first')
  })

  it('maps and recovers errors', () => {
    expect(
      Err('bad')
        .mapErr((error) => error.toUpperCase())
        .unwrapErr()
    ).toBe('BAD')
    expect(
      Err('bad')
        .orElse((error) => Ok(error.length))
        .unwrap()
    ).toBe(3)
  })

  it('converts branches to Option and transposes nested values', () => {
    expect(Ok(1).ok().unwrap()).toBe(1)
    expect(Err('bad').err().unwrap()).toBe('bad')
    expect(Ok(Ok(1)).flatten().unwrap()).toBe(1)
    expect(Ok(Option.some(1)).transpose().unwrap().unwrap()).toBe(1)
    expect(Ok(Option.none<number>()).transpose().isNone()).toBe(true)
    expect(Err('bad').transpose().unwrap().unwrapErr()).toBe('bad')
  })

  it('preserves the original error when unwrap fails', () => {
    const error = new Error('bad')
    let caught: unknown

    try {
      Err(error).expect('parse failed')
    } catch (cause) {
      caught = cause
    }

    expect(caught).toBeInstanceOf(ResultUnwrapError)
    expect(caught).toMatchObject({
      message: 'parse failed',
      cause: error,
      error,
    })
  })
})
