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

  it('throws when no case matches and no otherwise is provided', () => {
    expect(() =>
      match(
        3,
        caseOf(1, () => 'One')
      )
    ).toThrow('Pattern matching error')
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
})
