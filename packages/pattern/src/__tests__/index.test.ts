import { describe, expect, it } from 'vite-plus/test'

import {
  caseOf,
  isMatching,
  match,
  matchChain,
  otherwise,
  P,
} from '../index.js'

describe('@tsr/pattern', () => {
  it('matches primitive values with ordered cases', () => {
    expect(
      match(
        1,
        caseOf(1, () => 'One'),
        caseOf(2, () => 'Two'),
        otherwise(() => 'Other')
      )
    ).toBe('One')

    expect(
      match(
        3,
        caseOf(1, () => 'One'),
        otherwise(() => 'Other')
      )
    ).toBe('Other')
  })

  it('matches object, array, and discriminated union patterns', () => {
    expect(
      match(
        { status: 'active', profile: { name: 'Ada' } },
        caseOf(
          { status: 'active', profile: { name: P.string } },
          ({ profile }) => profile.name
        ),
        otherwise(() => 'Inactive')
      )
    ).toBe('Ada')

    expect(
      match(
        ['Ada', 37] as const,
        caseOf([P.string, P.number], ([name, age]) => `${name}: ${age}`),
        otherwise(() => 'Unknown')
      )
    ).toBe('Ada: 37')

    type State =
      | { type: 'success'; data: string }
      | { type: 'error'; message: string }

    const state: State = { type: 'error', message: 'offline' }

    expect(
      match(
        state,
        caseOf({ type: 'success' }, () => 'Success'),
        caseOf({ type: 'error' }, ({ type }) => type)
      )
    ).toBe('error')
  })

  it('throws when no case matches and no otherwise is provided', () => {
    let caught: unknown

    try {
      match(
        3,
        caseOf(1, () => 'One')
      )
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    expect(caught).toMatchObject({ input: 3 })
    expect((caught as Error).message).toContain('Pattern matching error')
  })

  it('uses otherwise when it is the only branch', () => {
    expect(
      match(
        3,
        otherwise(() => 'Other')
      )
    ).toBe('Other')
  })

  it('rejects multiple otherwise branches', () => {
    expect(() =>
      match(
        1,
        otherwise(() => 'First'),
        otherwise(() => 'Second')
      )
    ).toThrow('match accepts at most one otherwise case')
  })

  it('requires otherwise to be the final case', () => {
    expect(() =>
      match(
        1,
        otherwise(() => 'Other'),
        caseOf(1, () => 'One')
      )
    ).toThrow('otherwise must be the last match case')
  })

  it('supports reusable patterns and type guards', () => {
    const userPattern = { name: P.string }
    const isUser = isMatching(userPattern)

    expect(isUser({ name: 'Ada' })).toBe(true)
    expect(isUser({ name: 42 })).toBe(false)
    expect(
      match(
        { status: 'disabled' },
        caseOf({ status: 'active' }, () => 'Active'),
        otherwise(() => 'Disabled')
      )
    ).toBe('Disabled')
    expect(
      matchChain({ age: 20 })
        .with({ age: P.when((age) => age >= 18) }, () => 'adult')
        .otherwise(() => 'minor')
    ).toBe('adult')
  })

  it('supports the complete matchChain flow', () => {
    expect(
      matchChain({ age: 15, active: true })
        .with({ age: P.when((age) => age >= 18) }, () => 'adult')
        .when(
          ({ active }) => active,
          () => 'active'
        )
        .otherwise(() => 'other')
    ).toBe('active')

    expect(
      matchChain(2 as 1 | 2)
        .with(1, () => 'one')
        .with(2, () => 'two')
        .exhaustive()
    ).toBe('two')
  })
})
