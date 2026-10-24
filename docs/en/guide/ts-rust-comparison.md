# TypeScript and Rust Comparison

TSR expresses several Rust-inspired concepts through TypeScript package APIs. The table maps concepts; see each module guide for details and differences.

| Concept              | TSR / TypeScript                         | Common Rust idiom                   |
| -------------------- | ---------------------------------------- | ----------------------------------- |
| Optional value       | `Option<T>`                              | `Option<T>`                         |
| Success or failure   | `Result<T, E>`                           | `Result<T, E>`                      |
| Branch matching      | `match` and `caseOf` from `@tsr/pattern` | `match` expression                  |
| Iterator composition | `Iter<T>`                                | `Iterator` trait                    |
| Non-zero number      | Branded type and runtime constructor     | Standard types such as `NonZeroU32` |
| Integer range        | `range` factories                        | `a..b`, `a..=b`                     |

## Option

::: code-group

```ts [TypeScript]
import { Option } from '@tsr/core'

const greeting = Option.fromNullable('Ada').map((name) => `Hello, ${name}`)
```

```rust [Rust]
let greeting = Some("Ada").map(|name| format!("Hello, {name}"));
```

:::

## Result

::: code-group

```ts [TypeScript]
import { Result } from '@tsr/core'

const count = Result.ok('42')
  .map(Number)
  .andThen((value) =>
    Number.isFinite(value)
      ? Result.ok(value)
      : Result.err(new RangeError('Not finite'))
  )
```

```rust [Rust]
let count = "42"
    .parse::<f64>()
    .map_err(|error| error.to_string())
    .and_then(|value| {
        if value.is_finite() {
            Ok(value)
        } else {
            Err("Not finite".to_string())
        }
    });
```

:::

## Branch Matching

TypeScript declares branches with `caseOf`; Rust has a built-in `match` expression. Their exhaustiveness checking and pattern capabilities differ.

::: code-group

```ts [TypeScript]
import { caseOf, match, otherwise } from '@tsr/pattern'

type Status = 'ready' | 'busy'
const status: Status = 'busy'

const label = match(
  status,
  caseOf('ready', () => 'Ready'),
  caseOf('busy', () => 'Busy'),
  otherwise(() => 'Unknown')
)
```

```rust [Rust]
enum Status {
    Ready,
    Busy,
}

let status = Status::Busy;
let label = match status {
    Status::Ready => "Ready",
    Status::Busy => "Busy",
};
```

:::

## Lazy Iteration

::: code-group

```ts [TypeScript]
import { Iter } from '@tsr/iter'

const total = Iter.from([1, 2, 3, 4])
  .filter((value) => value % 2 === 0)
  .sum()
```

```rust [Rust]
let total = [1, 2, 3, 4]
    .into_iter()
    .filter(|value| value % 2 == 0)
    .sum::<i32>();
```

:::

TypeScript iterators do not provide Rust's ownership, borrowing, or lifetime checks. TSR implements synchronous iterator composition only; it does not extend TypeScript syntax or implement Rust's `?` operator.
