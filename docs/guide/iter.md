# 惰性迭代器

`@tsr/iter` 的 `Iter.from` 接受同步 `Iterable<T>`。适配器按需读取元素，终端操作消费当前剩余元素。

::: code-group

```ts [TypeScript]
import { Iter } from '@tsr/iter'

const values = Iter.from([1, -2, 3, 4, 5])
  .filter((value) => value > 0)
  .map((value) => value * 2)
  .take(3)
  .collect()
```

```rust [Rust]
let values = [1, -2, 3, 4, 5]
    .into_iter()
    .filter(|value| *value > 0)
    .map(|value| value * 2)
    .take(3)
    .collect::<Vec<_>>();
```

:::

## 操作

适配器包括 `map`、`flatMap`、`flatten`、`filter`、`filterMap`、`inspect`、`take`、`skip`、`stepBy`、`enumerate`、`chain` 和 `zip`。终端操作包括 `find`、`position`、`any`、`all`、`fold`、`reduce`、`sum`、`product`、`partition` 和 `collect`。

`find`、`position` 和 `reduce` 返回 `@tsr/core` 的 `Option`；`filterMap` 回调也返回 `Option`。`sum` 与 `product` 仅接受 `number`，空输入分别返回 `0` 和 `1`。

## 消费与清理

`Iter` 遵循单次消费语义。派生迭代器共享源的消费进度，终端操作只消费当前位置之后的元素。`any`、`all`、`find` 和 `position` 会短路；`take` 到达上限后，上游仍可继续消费，若需要结束生成器等资源，可显式调用 `return()`。更细的消费与清理约定见[设计文档](../design)。
