# 模式匹配

`@ffgenius/tsr` 导出自有的对象式分支 API，并将 `P`、`isMatching` 和 `matchChain` 转发自 [`ts-pattern`](https://github.com/gvergnaud/ts-pattern)。自有类型 `MatchCase`、`OtherwiseCase`、`Pattern<T>` 也直接从源码入口导出。

## 自有 API 示例

`MatchBranch` 与 `BranchOutput` 是实现内部类型，不从包入口导出。`match` 接受 `caseOf` / `otherwise` 返回的类型，匹配规则由底层 `ts-pattern` 执行。

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

`otherwise` 最多只能出现一次，并且必须是最后一个分支；违反顺序或重复使用时会抛出 `Error`。没有分支匹配且没有 `otherwise` 时会抛出 `NonExhaustiveError`。该对象式 `match` 在运行时按顺序匹配，不提供 TypeScript 编译期的穷尽性检查。

## ts-pattern 转发 API 示例

::: code-group

```ts [TypeScript]
import { isMatching, matchChain, P } from '@ffgenius/tsr'

const isNamed = isMatching({ name: P.string })
if (isNamed({ name: 'Ada' })) {
  // isNamed 的类型守卫会收窄对象类型。
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

`P`、`isMatching`、`Pattern<T>` 和 `matchChain` 使用上游 `ts-pattern` 的实现与类型定义；TSR 不重新定义其泛型签名。底层依赖的升级可能改变这些转发 API 的类型，以上游版本文档为准。

TSR 的对象式 `match` 与 `ts-pattern` 的穷尽性行为不同：对象式版本会在运行时对未匹配值抛出 `NonExhaustiveError`，`matchChain(...).exhaustive()` 则通过类型检查验证分支；Rust 的 `match` 对枚举分支做编译期穷尽检查。Rust 没有与 `isMatching` 完全相同的通用结构类型守卫，`matches!` 适用于枚举和值模式。

## API 参考

### 自有 API

| API                               | TypeScript 类型                                                                                                                               | 说明                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `MatchCase<Output = unknown>`     | `{ readonly kind: 'case'; readonly pattern: unknown; readonly handler: (value: never) => Output }`                                            | `caseOf` 返回的分支类型；通常无需手动构造。                  |
| `OtherwiseCase<Output = unknown>` | `{ readonly kind: 'otherwise'; readonly handler: () => Output }`                                                                              | `otherwise` 返回的默认分支类型；通常无需手动构造。           |
| `Pattern<T>`                      | `Pattern<T>`（`ts-pattern` 的 `Pattern.Pattern<T>` 类型别名）                                                                                 | 表示可匹配 `T` 的模式。                                      |
| `caseOf`                          | `caseOf<const PatternValue, const Output>(pattern: PatternValue, handler: (value: Pattern.infer<PatternValue>) => Output): MatchCase<Output>` | 声明模式及其处理器；处理器参数由模式推导。                   |
| `otherwise`                       | `otherwise<const Output>(handler: () => Output): OtherwiseCase<Output>`                                                                       | 声明不接收输入值的默认处理器。                               |
| `match`                           | `match<const Value, const Cases extends readonly MatchBranch[]>(value: Value, ...cases: Cases): BranchOutput<Cases[number]>`                  | 按顺序执行首个匹配分支，返回类型是所有处理器输出的联合类型。 |

### 转发自 ts-pattern 的 API

| API          | TypeScript 类型 / 行为                                                                              | 说明                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `matchChain` | 与 `ts-pattern` 的 `match` 完全相同；源码以 `export { match as matchChain } from 'ts-pattern'` 转发 | 进入链式匹配 API，可使用 `.with`、`.when`、`.otherwise`、`.exhaustive()` 等方法。类型由安装的 `ts-pattern` 版本提供。                                                                                  |
| `isMatching` | 与 `ts-pattern` 的 `isMatching` 完全相同                                                            | 传入模式可生成类型守卫；也可同时传入值执行判断。具体泛型重载由 `ts-pattern` 声明提供。                                                                                                                 |
| `P`          | `ts-pattern` 的模式构造器命名空间                                                                   | 常用构造器包括 `P.string`、`P.number`、`P.boolean`、`P.nullish`、`P.instanceOf`、`P.array`、`P.record`、`P.union`、`P.intersection`、`P.not`、`P.when`、`P.select` 和 `P.shape`；完整 API 见上游文档。 |
