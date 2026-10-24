# Option 与 Result

`@tsr/core` 提供显式表达“有值或无值”以及“成功或失败”的类型。它们是普通同步值；异步流程仍使用 `Promise<Result<T, E>>`。

## Option

通过 `Option.some`、`Option.none` 或 `Option.fromNullable` 创建值。`map`、`andThen`、`filter`、`flatten` 和 `zip` 用于组合；`unwrap` / `expect` 在无值时抛出 `OptionUnwrapError`，`unwrapOr` 和 `unwrapOrElse` 则提供默认值。

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

`Option.some(undefined)` 仍表示存在值，与 `Option.none()` 不同。`fromNullable` 只把 `null` 和 `undefined` 转为 `None`。

## Result

使用 `Result.ok` 和 `Result.err` 表达成功与失败。`map` 只转换成功值，`mapErr` 只转换错误，`andThen` 串接可能失败的操作并合并错误类型，`orElse` 可从错误分支恢复。

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

对失败分支调用 `unwrap` / `expect` 会抛出 `ResultUnwrapError`，原始错误可通过 `cause` 和 `error` 读取。不会自动吞掉 Promise rejection。
