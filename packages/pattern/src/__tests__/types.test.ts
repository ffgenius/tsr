import { expectTypeOf, test } from 'vite-plus/test'

import type { Pattern } from '../index.js'

import { caseOf, match, otherwise, P } from '../index.js'

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
