# Pattern Matching

`@tsr/pattern` provides a stable entry point backed by `ts-pattern`. Object-style `match` evaluates ordered `caseOf` branches and accepts an optional `otherwise`; use `matchChain` for more complex conditions.

::: code-group

```ts [TypeScript]
import { caseOf, match, otherwise, P } from '@tsr/pattern'

type Reply = { type: 'ok'; value: string } | { type: 'error'; message: string }

function describe(reply: Reply): string {
  return match(
    reply,
    caseOf({ type: 'ok', value: P.string }, ({ value }) => value),
    caseOf(
      { type: 'error', message: P.string },
      ({ message }) => `Failed: ${message}`
    ),
    otherwise(() => 'Unknown')
  )
}
```

```rust [Rust]
enum Reply {
    Ok(String),
    Error { message: String },
}

fn describe(reply: Reply) -> String {
    match reply {
        Reply::Ok(value) => value,
        Reply::Error { message } => format!("Failed: {message}"),
    }
}
```

:::

## Other Exports

- `P` exposes `ts-pattern` pattern constructors.
- `isMatching` can create a type guard or test a value directly.
- `Pattern<T>` describes a pattern that can match `T`.
- `matchChain` supports `.with`, `.when`, `.otherwise`, and `.exhaustive()`.

If no branch matches and there is no `otherwise`, `match` throws `NonExhaustiveError` at runtime. Object-style `match` does not guarantee compile-time exhaustiveness checking by TypeScript.
