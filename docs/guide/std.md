# 类型安全工具

`@tsr/std` 提供通过构造器和运行时检查创建的品牌类型，以及惰性整数范围。

## 非空值与数值约束

`nonEmptyString`、`nonEmptyArray`、`nonZero`、`positive`、`negative`、`finiteNumber` 和 `bounded` 返回 `Result<值, RangeError>`。对应的 `is...` 函数可用作类型守卫。`nonEmptyArray` 成功时返回冻结的浅拷贝。

::: code-group

```ts [TypeScript]
import { nonZero, positive } from '@tsr/std'

const retries = positive(3).map((count) => count + 1)
const divisor = nonZero(2).map((value) => 10 / value)
```

```rust [Rust]
use std::num::NonZeroU32;

let retries = NonZeroU32::new(3).map(|count| count.get() + 1);
let divisor = NonZeroU32::new(2).map(|value| 10 / value.get());
```

:::

Rust 标准库的 `NonZeroU32` 等类型可表达非零约束；其他约束需要按具体类型和校验规则处理。TSR 的品牌类型也需要运行时构造或校验，不能替代对外部输入的验证。

## 整数范围

`range.closed`、`range.open`、`range.closedOpen` 和 `range.openClosed` 返回可重复遍历的 `Iterable<number>`。端点必须是安全整数，范围只正向递增；起点大于终点时为空。

::: code-group

```ts [TypeScript]
import { range } from '@tsr/std'

const values = [...range.closedOpen(0, 4)]
```

```rust [Rust]
let values = (0..4).collect::<Vec<_>>();
```

:::

Rust 的 `0..4` 是左闭右开范围。Rust 范围的端点、步进和类型约束不与 TSR 的四种工厂方法完全相同。
