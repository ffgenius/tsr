import { describe, expect, it } from 'vite-plus/test'

import { Err, Ok, Option, Result, ResultUnwrapError } from '../index.js'

describe('Result', () => {
  it('keeps undefined payloads distinct by branch tag', () => {
    const ok = Ok(undefined)
    const err = Err(undefined)

    expect(ok.isOk()).toBe(true)
    expect(ok.unwrap()).toBeUndefined()
    expect(err.isErr()).toBe(true)
    expect(err.unwrapErr()).toBeUndefined()
  })

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
    expect(Ok(1).err().isNone()).toBe(true)
    expect(Err('bad').err().unwrap()).toBe('bad')
    expect(Err('bad').ok().isNone()).toBe(true)
    expect(Ok(Ok(1)).flatten().unwrap()).toBe(1)
    expect(Err('bad').flatten().unwrapErr()).toBe('bad')
    expect(Ok(Option.some(1)).transpose().unwrap().unwrap()).toBe(1)
    expect(Ok(Option.none<number>()).transpose().isNone()).toBe(true)
    expect(Err('bad').transpose().unwrap().unwrapErr()).toBe('bad')
  })

  it('short-circuits callbacks and evaluates fallbacks only for Err', () => {
    let calls = 0
    const err = Err<string, number>('bad')

    expect(
      err
        .map(() => {
          calls++
          return 1
        })
        .unwrapErr()
    ).toBe('bad')
    expect(
      err
        .mapErr((error) => {
          calls++
          return error.toUpperCase()
        })
        .unwrapErr()
    ).toBe('BAD')
    expect(
      err
        .andThen(() => {
          calls++
          return Ok(1)
        })
        .unwrapErr()
    ).toBe('bad')
    expect(
      err.unwrapOrElse((error) => {
        calls++
        return error.length
      })
    ).toBe(3)
    expect(
      Ok(1).unwrapOrElse(() => {
        calls++
        return 0
      })
    ).toBe(1)
    expect(calls).toBe(2)
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
    expect(() => Err(error).unwrap()).toThrow(ResultUnwrapError)
    expect(() => Ok(1).unwrapErr()).toThrow(ResultUnwrapError)
  })

  it('keeps Result values explicit inside Promise workflows', async () => {
    const load = async (input: string): Promise<Result<number, string>> =>
      input === 'bad' ? Err('invalid input') : Ok(Number(input))
    const resolved = await load('2').then((result) =>
      result.map((value) => value * 2)
    )
    const failed = await load('bad')
    const rejected = async (): Promise<Result<number, string>> => {
      throw new Error('transport failure')
    }

    expect(resolved.unwrap()).toBe(4)
    expect(failed.unwrapErr()).toBe('invalid input')
    await expect(rejected()).rejects.toThrow('transport failure')
  })
})
