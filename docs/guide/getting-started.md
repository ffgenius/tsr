# 快速开始

## 安装

```sh
npm install @ffgenius/tsr
```

## 使用

```ts
import {
  Iter,
  Ok,
  Option,
  caseOf,
  match,
  otherwise,
  range,
} from '@ffgenius/tsr'

const name = Option.fromNullable<string>(null).unwrapOr('Guest')
const total = Iter.from(range.closed(1, 3))
  .map((value) => value * 2)
  .sum()
const doubled = Ok(total)
  .map((value) => value * 2)
  .unwrapOr(0)

const message = match(
  { type: 'success', value: doubled } as const,
  caseOf({ type: 'success' }, ({ value }) => `Total: ${value}`),
  otherwise(() => 'No result')
)
```

`Option` / `Result` 用于表达可选值和可恢复结果；`Iter` 提供惰性迭代操作；`match` 按模式处理不同分支。需要单独查看某项 API 时，参见对应模块指南。
