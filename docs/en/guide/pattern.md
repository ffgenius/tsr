# Pattern Matching

`@ffgenius/tsr` exports its own object-style branch API and re-exports `P`, `isMatching`, and `matchChain` from [`ts-pattern`](https://github.com/gvergnaud/ts-pattern). The source entry point also exports `MatchCase`, `OtherwiseCase`, and `Pattern<T>` types.

## TSR examples

`MatchBranch` and `BranchOutput` are internal types and are not exported from the package entry point. `match` accepts branches returned by `caseOf` / `otherwise`; matching itself is performed by `ts-pattern`.

::: code-group

```ts [TypeScript]
import { caseOf, match, otherwise, P } from '@ffgenius/tsr'
import type { Pattern } from '@ffgenius/tsr'

type Reply = { type: 'ok'; value: string } | { type: 'error'; message: string }
const pattern: Pattern<Reply> = { type: 'ok', value: P.string }
const message = match(
  { type: 'ok', value: 'ready' } as Reply,
  caseOf(pattern, ({ value }) => value),
  otherwise(() => 'unknown')
)
```

```rust [Rust]
enum Reply {
    Ok(String),
    Error(String),
}

let reply = Reply::Ok("ready".to_string());
let message = match reply {
    Reply::Ok(value) => value,
    Reply::Error(message) => message,
};
```

:::

At most one `otherwise` branch is allowed, and it must be last. A duplicate or a branch after it throws `Error`. If no branch matches and there is no fallback, `match` throws `NonExhaustiveError`. This object-style API matches branches in runtime order and does not provide compile-time exhaustiveness checking in TypeScript.

## Re-exports from ts-pattern examples

::: code-group

```ts [TypeScript]
import { isMatching, matchChain, P } from '@ffgenius/tsr'

const isNamed = isMatching({ name: P.string })
if (isNamed({ name: 'Ada' })) {
  // The type guard narrows the object type.
}

const label = matchChain('ready' as 'ready' | 'busy')
  .with('ready', () => 'Ready')
  .with('busy', () => 'Busy')
  .exhaustive()
```

```rust [Rust]
enum Status {
    Ready,
    Busy,
}

let status = Status::Ready;
let is_ready = matches!(status, Status::Ready);
let label = match status {
    Status::Ready => "Ready",
    Status::Busy => "Busy",
};
```

:::

`P`, `isMatching`, `Pattern<T>`, and `matchChain` use upstream `ts-pattern` implementations and declarations; TSR does not redefine their generic signatures. Upgrades to this dependency can change the re-exported types, so use the documentation for the installed upstream version as the final reference.

TSR's object-style `match` and `ts-pattern` have different exhaustiveness behavior: the object-style API throws `NonExhaustiveError` for unmatched values at runtime, while `matchChain(...).exhaustive()` checks branches through TypeScript types. Rust checks enum exhaustiveness at compile time. Rust has no general structural type guard exactly like `isMatching`; `matches!` applies to enum and value patterns.

## API Reference

### TSR API

| API                               | TypeScript type                                                                                                                               | Description                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `MatchCase<Output = unknown>`     | `{ readonly kind: 'case'; readonly pattern: unknown; readonly handler: (value: never) => Output }`                                            | Branch type returned by `caseOf`; normally you do not construct it manually.         |
| `OtherwiseCase<Output = unknown>` | `{ readonly kind: 'otherwise'; readonly handler: () => Output }`                                                                              | Fallback type returned by `otherwise`; normally you do not construct it manually.    |
| `Pattern<T>`                      | `Pattern<T>` (type alias for `ts-pattern`'s `Pattern.Pattern<T>`)                                                                             | A pattern that can match `T`.                                                        |
| `caseOf`                          | `caseOf<const PatternValue, const Output>(pattern: PatternValue, handler: (value: Pattern.infer<PatternValue>) => Output): MatchCase<Output>` | Declares a pattern and handler; the handler argument is inferred from the pattern.   |
| `otherwise`                       | `otherwise<const Output>(handler: () => Output): OtherwiseCase<Output>`                                                                       | Declares a fallback handler that receives no value.                                  |
| `match`                           | `match<const Value, const Cases extends readonly MatchBranch[]>(value: Value, ...cases: Cases): BranchOutput<Cases[number]>`                  | Runs the first matching branch in order; the result is the union of handler outputs. |

### Re-exports from ts-pattern

| API          | TypeScript type / behavior                                                                                             | Description                                                                                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matchChain` | Exactly the `ts-pattern` `match` API; the source re-exports it with `export { match as matchChain } from 'ts-pattern'` | Starts chain-style matching with methods such as `.with`, `.when`, `.otherwise`, and `.exhaustive()`. Types come from the installed `ts-pattern` version.                                                                           |
| `isMatching` | Exactly the `ts-pattern` `isMatching` API                                                                              | Given a pattern, returns a type guard; it can also test a value directly. Its generic overloads come from `ts-pattern` declarations.                                                                                                |
| `P`          | The `ts-pattern` pattern-constructor namespace                                                                         | Common constructors include `P.string`, `P.number`, `P.boolean`, `P.nullish`, `P.instanceOf`, `P.array`, `P.record`, `P.union`, `P.intersection`, `P.not`, `P.when`, `P.select`, and `P.shape`; see upstream docs for the full API. |
