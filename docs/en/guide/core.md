# Option and Result

`@tsr/core` provides explicit types for values that may be absent and operations that may fail. They are synchronous values; asynchronous workflows use `Promise<Result<T, E>>`.

## Option

Create values with `Option.some`, `Option.none`, or `Option.fromNullable`. Compose operations with `map`, `andThen`, `filter`, `flatten`, and `zip`. `unwrap` and `expect` throw `OptionUnwrapError` for `None`; `unwrapOr` and `unwrapOrElse` provide defaults.

::: code-group

```ts [TypeScript]
import { Option } from '@tsr/core'

const displayName = Option.fromNullable(' Ada ')
  .map((name) => name.trim())
  .filter((name) => name.length > 0)
  .unwrapOr('Guest')
```

```rust [Rust]
let display_name = Some(" Ada ")
    .map(str::trim)
    .filter(|name| !name.is_empty())
    .unwrap_or("Guest");
```

:::

`Option.some(undefined)` still represents a present value and differs from `Option.none()`. `fromNullable` converts only `null` and `undefined` to `None`.

## Result

Use `Result.ok` and `Result.err` to represent success and failure. `map` transforms only the success value, `mapErr` transforms only the error, `andThen` combines error types, and `orElse` can recover from the error branch.

::: code-group

```ts [TypeScript]
import { Result } from '@tsr/core'

function parsePort(input: string): Result<number, RangeError> {
  const value = Number(input)
  return Number.isInteger(value) && value >= 1 && value <= 65535
    ? Result.ok(value)
    : Result.err(new RangeError('Invalid port'))
}

const port = parsePort('8080')
  .map((value) => value + 1)
  .unwrapOr(3000)
```

```rust [Rust]
fn parse_port(input: &str) -> Result<u16, &'static str> {
    input.parse::<u16>().map_err(|_| "Invalid port")
}

let port = parse_port("8080").map(|value| value + 1).unwrap_or(3000);
```

:::

Calling `unwrap` or `expect` on a failed result throws `ResultUnwrapError`. The original error is available through `cause` and `error`; Promise rejections are not swallowed automatically.
