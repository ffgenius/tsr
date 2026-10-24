# TS 与 Rust 对照

TSR 将一些 Rust 常见概念表达为 TypeScript 包 API。下表说明概念对应关系；具体差异以各模块文档为准。

| 概念       | TSR / TypeScript                     | Rust 常见写法             |
| ---------- | ------------------------------------ | ------------------------- |
| 可选值     | `Option<T>`                          | `Option<T>`               |
| 成功或失败 | `Result<T, E>`                       | `Result<T, E>`            |
| 分支匹配   | `@ffgenius/tsr` 的 `match`、`caseOf` | `match` 表达式            |
| 迭代组合   | `Iter<T>`                            | `Iterator` trait          |
| 非零数值   | 品牌类型与运行时构造器               | `NonZeroU32` 等标准库类型 |
| 整数范围   | `range` 工厂函数                     | `a..b`、`a..=b`           |

## Option

::: code-group

```ts [TypeScript]
import { Option } from '@ffgenius/tsr'

const greeting = Option.fromNullable('Ada').map((name) => `Hello, ${name}`)
```

```rust [Rust]
let greeting = Some("Ada").map(|name| format!("Hello, {name}"));
```

:::

## Result

::: code-group

```ts [TypeScript]
import { Result } from '@ffgenius/tsr'

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

## 分支匹配

TypeScript 通过 `caseOf` 声明各分支，Rust 使用语言内建的 `match`。两者的穷尽性检查和模式表达能力不同。

::: code-group

```ts [TypeScript]
import { caseOf, match, otherwise } from '@ffgenius/tsr'

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

## 惰性迭代

::: code-group

```ts [TypeScript]
import { Iter } from '@ffgenius/tsr'

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

TypeScript 的迭代器不提供 Rust 的所有权、借用和生命周期检查。TSR 只实现同步迭代组合，不扩展 TypeScript 语法，也不实现 Rust 的 `?` 运算符。
