# 模式匹配

`@tsr/pattern` 提供基于 `ts-pattern` 的稳定入口。对象式 `match` 使用有序的 `caseOf` 分支，可选 `otherwise`；复杂条件可使用 `matchChain`。

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

## 其他入口

- `P` 提供 `ts-pattern` 的模式构造器。
- `isMatching` 可生成类型守卫，或直接判断一个值。
- `Pattern<T>` 描述可匹配 `T` 的模式类型。
- `matchChain` 支持 `.with`、`.when`、`.otherwise` 和 `.exhaustive()`。

没有匹配分支且未提供 `otherwise` 时，`match` 会在运行时抛出 `NonExhaustiveError`。对象式 `match` 不承诺 TypeScript 编译期穷尽性证明。
