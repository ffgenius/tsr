import { match as patternMatch, NonExhaustiveError } from 'ts-pattern'

type PatternInfer<PatternValue> =
  import('ts-pattern').Pattern.infer<PatternValue>

export type MatchCase<Output = unknown> = {
  readonly kind: 'case'
  readonly pattern: unknown
  readonly handler: (value: never) => Output
}

export type OtherwiseCase<Output = unknown> = {
  readonly kind: 'otherwise'
  readonly handler: () => Output
}

export function caseOf<const PatternValue, const Output>(
  pattern: PatternValue,
  handler: (value: PatternInfer<PatternValue>) => Output
): MatchCase<Output> {
  return {
    kind: 'case',
    pattern,
    handler: handler as (value: never) => Output,
  }
}

export function otherwise<const Output>(
  handler: () => Output
): OtherwiseCase<Output> {
  return {
    kind: 'otherwise',
    handler,
  }
}

type MatchBranch = MatchCase | OtherwiseCase

type BranchOutput<Branch> = Branch extends
  | MatchCase<infer Output>
  | OtherwiseCase<infer Output>
  ? Output
  : never

export function match<const Value, const Cases extends readonly MatchBranch[]>(
  value: Value,
  ...cases: Cases
): BranchOutput<Cases[number]> {
  const otherwiseIndex = cases.findIndex(
    (branch) => branch.kind === 'otherwise'
  )

  if (
    otherwiseIndex !== -1 &&
    cases.slice(otherwiseIndex + 1).some((branch) => branch.kind === 'case')
  ) {
    throw new Error('otherwise must be the last match case')
  }

  if (cases.filter((branch) => branch.kind === 'otherwise').length > 1) {
    throw new Error('match accepts at most one otherwise case')
  }

  let fallback: (() => unknown) | undefined

  for (const branch of cases) {
    if (branch.kind === 'otherwise') {
      fallback = branch.handler
      continue
    }

    const noMatch = Symbol('no-match')
    const result = patternMatch(value)
      .with(branch.pattern as never, (matchedValue) =>
        branch.handler(matchedValue as never)
      )
      .otherwise(() => noMatch)

    if (result !== noMatch) {
      return result as BranchOutput<Cases[number]>
    }
  }

  if (fallback) {
    return fallback() as BranchOutput<Cases[number]>
  }

  throw new NonExhaustiveError(value)
}

export { isMatching, P } from 'ts-pattern'
export { match as matchChain } from 'ts-pattern'
export type Pattern<T> = import('ts-pattern').Pattern.Pattern<T>
