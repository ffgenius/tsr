import { expectTypeOf, test } from 'vite-plus/test'

import type { Pattern } from '../index.js'

import { caseOf, match, matchChain, otherwise, P } from '../index.js'

type State =
  | { type: 'success'; data: string }
  | { type: 'error'; message: string }

test('exports the pattern type and inference namespace', () => {
  const statePattern = {
    type: P.union('success', 'error'),
  } satisfies Pattern<State>

  expectTypeOf<P.infer<typeof statePattern>>().toEqualTypeOf<{
    type: 'success' | 'error'
  }>()
})

test('infers the union of case outputs', () => {
  const output = match(
    1 as 1 | 2,
    caseOf(1, () => 'one' as const),
    caseOf(2, () => 2 as const),
    otherwise(() => 'other' as const)
  )

  expectTypeOf(output).toEqualTypeOf<'one' | 2 | 'other'>()
})

test('infers handlers and outputs for object, array, and union patterns', () => {
  const objectOutput = match(
    { user: { name: 'Ada' }, active: true },
    caseOf({ user: { name: P.string }, active: true }, ({ user }) => user.name),
    otherwise(() => 'unknown' as const)
  )

  expectTypeOf(objectOutput).toEqualTypeOf<string | 'unknown'>()

  const arrayOutput = match(
    ['Ada', 37] as const,
    caseOf([P.string, P.number], ([name, age]) => name.length + age),
    otherwise(() => 'unknown' as const)
  )

  expectTypeOf(arrayOutput).toEqualTypeOf<number | 'unknown'>()

  const state: State = { type: 'success', data: 'ready' }
  const unionOutput = match(
    state,
    caseOf({ type: 'success' }, () => 'success' as const),
    caseOf({ type: 'error' }, () => 'error' as const),
    otherwise(() => 'unknown' as const)
  )

  expectTypeOf(unionOutput).toEqualTypeOf<'success' | 'error' | 'unknown'>()
})

test('preserves otherwise and matchChain output inference', () => {
  const onlyOtherwise = match(
    1,
    otherwise(() => 'fallback' as const)
  )
  expectTypeOf(onlyOtherwise).toEqualTypeOf<'fallback'>()

  const noOtherwise = match(
    1 as 1 | 2,
    caseOf(1, () => 'one' as const),
    caseOf(2, () => 2 as const)
  )
  expectTypeOf(noOtherwise).toEqualTypeOf<'one' | 2>()

  const chained = matchChain(1 as 1 | 2)
    .with(1, () => 'one' as const)
    .otherwise(() => 2 as const)
  expectTypeOf(chained).toEqualTypeOf<'one' | 2>()
})
