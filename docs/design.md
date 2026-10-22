# Rust-inspired TypeScript Toolkit — 设计文档

> 状态：Draft  
> 版本：0.1.0  
> 语言：TypeScript  
> 包管理：pnpm  
> 项目形态：pnpm monorepo  
> 核心目标：为 TypeScript 提供一套受 Rust 标准库、类型系统与编程范式启发的通用工具库。

## 1. 项目概述

### 1.1 背景

TypeScript 提供了强大的静态类型系统，但在日常开发中仍存在一些问题：

- 缺少原生的 `Option<T>` 和 `Result<T, E>` 类型约定。
- 缺少 Rust 风格的模式匹配和穷尽性检查体验。
- 类型转换按具体场景实现，不额外模拟通用 Trait 协议。
- 原生数组迭代器主要面向 JavaScript 生态，缺少与 Rust Iterator 一致的惰性组合 API。
- 缺少统一的非空类型、非零类型、受限数值等类型安全抽象。
- 错误处理、资源管理和函数组合缺少一套风格一致的公共 API。

现有库分别解决了这些问题的一部分：

- Effect：函数式抽象、错误处理、Option、Result、资源管理及计算组合。
- ts-pattern：模式匹配、类型收窄、穷尽性检查。
- neverthrow：Result、错误传播和异步 Result。

但它们有不同的设计理念、命名规范和运行时模型，无法直接组合成一套完全统一的 Rust 风格标准库。

### 1.2 项目目标

构建一套面向 TypeScript 的 Rust-inspired Toolkit，提供：

1. 统一的基础类型和错误处理模型。
2. 统一的函数式 API。
3. Rust 风格的模式匹配和穷尽性检查。
4. 惰性迭代器及可组合的数据处理 API。
5. 通过品牌类型和运行时校验增强类型安全。
6. 与 JavaScript、TypeScript 原生能力协同，而非重新发明整套语言。
7. 为未来的语法转换工具预留扩展空间。

### 1.3 设计定位

本项目不是 Rust 的 TypeScript 移植版，也不是另一个完整的函数式编程框架。

项目的核心定位是：

**在不改变 TypeScript 基本开发方式的前提下，提供统一、类型安全、可组合且接近 Rust 开发体验的标准工具库。**

## 2. 设计原则

### 2.1 API 统一，依赖解耦

不同模块可以借鉴不同的成熟实现，但必须遵循统一的公共 API 规范。

例如：

- `Option` 参考 Effect、True Myth 等实现。
- `Result` 参考 neverthrow 和 Effect 的错误处理设计。
- `match` 参考 ts-pattern。
- `Iterator` 参考 Rust 标准库及 JavaScript Iterator Protocol。

这些项目属于设计参考或可选适配对象，不意味着核心包必须依赖它们。

### 2.2 Core 不依赖完整 Effect 运行时

基础类型不应强制依赖完整的异步计算框架。

使用者只需要 `Option` 或 `Result` 时，不应因此引入整个 Effect 生态。

### 2.3 只模拟可以合理表达的 Rust 能力

可以优先实现：

- `Option`、`Result`
- `match`
- `From`、`TryFrom`
- `Default`、`Display`、`Clone`
- `Iterator`
- `NonZero`、`NonEmpty`
- `Range`
- `Cow` 风格的拥有或借用状态表达

不承诺完整实现：

- Rust 所有权和借用检查。
- 生命周期检查。
- `unsafe` 语义。
- 完整的 Trait 系统。
- 原生 `?` 运算符。
- Rust 宏系统。

### 2.4 类型安全与运行时安全分离

TypeScript 类型检查无法替代运行时验证。

对于用户输入、JSON、环境变量和外部数据，必须提供运行时校验入口。

品牌类型只负责区分静态类型，不应被描述为不可绕过的安全机制。

### 2.5 优先组合，不污染原生对象

不修改以下原生对象：

- `Array.prototype`
- `Object.prototype`
- `String.prototype`
- 其他全局原型

尽量采用独立函数、不可变值对象和显式构造器。

### 2.6 关注可摇树优化和运行时成本

- 优先提供细粒度模块入口。
- 避免在模块加载时执行不必要的初始化。
- 纯函数尽可能保持纯函数语义。
- 不引入无必要的全局状态。
- 对性能敏感的模块提供基准测试。

## 3. 整体架构

采用 pnpm monorepo。

```text
rust-ts-toolkit/
├── packages/
│   ├── core/
│   ├── pattern/
│   ├── iter/
│   ├── std/
│   ├── effect/
│   └── transform/
├── examples/
├── benchmarks/
├── docs/
│   ├── design.md
│   ├── api-guidelines.md
│   └── decisions/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

### 3.1 模块职责

| 模块        | 职责                               | 优先级 |
| ----------- | ---------------------------------- | ------ |
| `core`      | Option、Result、基础类型与错误处理 | P0     |
| `pattern`   | match、模式匹配、穷尽性检查        | P0     |
| `iter`      | 惰性迭代器、Range、数据组合        | P1     |
| `std`       | NonZero、NonEmpty、Cow 等工具类型  | P1     |
| `effect`    | 与 Effect 生态的适配               | P2     |
| `transform` | 可选的编译器转换和语法扩展         | P3     |

第一阶段完成 `core` 和 `pattern`。`@tsr/pattern` 依赖 `ts-pattern` 实现匹配，并提供项目稳定的公共入口。

### 3.2 依赖方向

```text
core
 ├── iter
 └── std

pattern ──> ts-pattern

effect ──> core adapters

transform ──> core conventions
```

约束：

- `core` 不依赖 `iter`、`effect`、`transform`、`pattern` 或 `ts-pattern`。
- `pattern` 依赖 `ts-pattern`，不依赖 `core`。
- `iter` 可以依赖 `core`，但不依赖 Effect。
- `effect` 作为独立适配层。
- `transform` 作为独立工具链，不成为普通运行时用户的强制依赖。
- 具体依赖关系以包级测试和构建图为准，不允许循环依赖。

## 4. Core：基础类型

### 4.1 Option

提供表达值存在或不存在的显式类型。

建议 API：

```ts
Option<T>
Some<T>
None
```

示例：

```ts
const user = Option.some({
  id: 1,
  name: 'Bin',
})

const name = user
  .map((user) => user.name)
  .filter((name) => name.length > 0)
  .unwrapOr('Anonymous')
```

基础方法：

- `map`
- `andThen`
- `filter`
- `flatten`
- `zip`
- `unwrap`
- `expect`
- `unwrapOr`
- `unwrapOrElse`
- `okOr`
- `isSome`
- `isNone`
- `match`

设计要求：

1. `map` 必须保留正确的泛型推导。
2. `andThen` 必须正确推导返回的 Option 类型。
3. `unwrap` 在无值时抛出明确的异常。
4. `unwrapOrElse` 必须延迟计算默认值。
5. 提供 `fromNullable`，明确处理 `null` 和 `undefined`。
6. 区分 `None` 与 `Some(undefined)`，避免无意中丢失信息。
7. 明确 `Option` 的表示方式，统一所有模块的判断规则。

### 4.2 Result

提供显式的成功与失败类型。

```ts
Result<T, E>
Ok<T, E>
Err<T, E>
```

示例：

```ts
function parsePort(input: string): Result<number, Error> {
  const value = Number(input)

  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    return Err(new Error('Invalid port'))
  }

  return Ok(value)
}

const result = parsePort('3000')
  .map((port) => port + 1)
  .mapErr((error) => new Error(`Configuration error: ${error.message}`))
```

基础方法：

- `map`
- `mapErr`
- `andThen`
- `orElse`
- `unwrap`
- `expect`
- `unwrapOr`
- `unwrapOrElse`
- `unwrapErr`
- `isOk`
- `isErr`
- `ok`
- `err`
- `match`
- `transpose`
- `flatten`

设计要求：

1. 全项目只定义一种规范的 `Result<T, E>`。
2. `map` 只转换成功值，`mapErr` 只转换错误。
3. `andThen` 支持错误类型的合理组合。
4. `orElse` 支持错误恢复。
5. `unwrap` 与 `expect` 在失败时抛出明确异常。
6. 原生异常可以转换为 `Result`，但不能自动吞掉错误。
7. Result 与 Promise 分离，不将异步能力混入基础类型。

### 4.3 同步与异步边界

同步结果：

```ts
Result<T, E>
```

异步结果：

```ts
Promise<Result<T, E>>
```

Effect 计算：

```ts
Effect.Effect<T, E, R>
```

三者具有不同的语义。

项目不把 Promise、Result 和 Effect 强行合并成一个类型。

未来可以提供显式转换：

```ts
fromPromise(...)
toPromise(...)
fromEffect(...)
toEffect(...)
```

具体 API 需要经过错误语义评审后再确定。

## 5. Pattern：Rust 风格模式匹配

### 5.1 目标

提供接近 Rust `match` 的分支表达能力：

```ts
import { caseOf, match, otherwise } from '@tsr/pattern'

const output = match(
  age,
  caseOf(1, () => 'One'),
  caseOf(2, () => 'Two'),
  otherwise(() => 'Other')
)
```

目标能力：

- 判别联合类型匹配。
- 对象和数组解构。
- 字面量匹配。
- 嵌套匹配。
- 条件守卫。
- 穷尽性检查。
- 返回值类型推导。

### 5.2 实现策略

`@tsr/pattern` 复用 `ts-pattern` 的匹配实现和类型推导，并限定项目支持的公共入口。它不重新实现模式匹配算法。

首版公共 API：

- `match(value, ...cases)`：按顺序执行 `caseOf(pattern, handler)` 分支，支持原始值、对象、数组和 `P` 模式，不要求改造原始数据。
- `caseOf(pattern, handler)`：声明一个模式分支，复用 `ts-pattern` 的模式匹配和处理器推导。
- `otherwise(handler)`：声明可选的默认分支。没有默认分支且没有模式匹配时，自动抛出 `NonExhaustiveError`。
- `matchChain(value)`：保留 `ts-pattern` 的链式 API，支持 `.with(pattern, handler)`、`.when(guard, handler)`、`.otherwise(handler)` 和 `.exhaustive()`，用于对象式 API 无法表达的复杂模式。
- `P`：模式构造器命名空间。支持通配符 `_`、原始类型模式、`nullish`、`nonNullable`、`instanceOf`、`array`、`map`、`set`、`record`、`optional`、`union`、`intersection`、`not`、`when`、`select` 和 `shape`。
- `isMatching(pattern)` / `isMatching(pattern, value)`：运行时模式判断，并在类型层面提供类型守卫。
- `Pattern<T>`：描述可匹配 `T` 的模式类型。

不单独导出底层 `NonExhaustiveError`，也不增加项目自有的匹配语法。以上述入口和行为测试作为兼容边界。

### 5.3 穷尽性检查

示例：

```ts
import { caseOf, match, P } from '@tsr/pattern'

type State =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; data: string }
  | { type: 'error'; error: Error }

const message = match(
  state,
  caseOf({ type: 'idle' }, () => 'Idle'),
  caseOf({ type: 'loading' }, () => 'Loading'),
  caseOf({ type: 'success', data: P.string }, ({ data }) => data),
  caseOf(
    { type: 'error', error: P.instanceOf(Error) },
    ({ error }) => error.message
  )
)
```

没有 `otherwise` 时，运行时未匹配会抛出 `NonExhaustiveError`；TypeScript 无法证明任意模式集合已穷尽，因此不承诺所有模式都能在编译期穷尽检查。

## 6. TypeScript 原生能力

不单独提供 `@tsr/traits`。类型转换、格式化和默认值按具体场景使用普通函数或工厂函数；可能失败的转换可以返回 `@tsr/core` 的 `Result`。不为对齐 Rust 命名而增加缺少实际收益的协议抽象。

## 7. Iter：惰性迭代器

### 7.1 目标

提供 Rust 风格的惰性迭代器组合 API，而不是重复实现数组方法。

示例：

```ts
const selected = Iter.from(values)
  .filter((value) => value > 0)
  .map((value) => value * 2)
  .take(10)
  .collect()
```

### 7.2 基础 API

当前已实现 `Iter.from`、`map`、`filter`、`take`、`find`、`any`、`all`、`collect`，以及标准迭代协议的 `next`、`return` 和 `[Symbol.iterator]`。`find` 返回 `@tsr/core` 的 `Option`。输入类型、共享消费进度和资源清理规则见 [@tsr/iter 使用说明](../packages/iter/README.md)。

以下为目标 API 列表，尚未全部实现：

- `map`
- `filter`
- `filterMap`
- `flatMap`
- `flatten`
- `enumerate`
- `take`
- `skip`
- `stepBy`
- `chain`
- `zip`
- `inspect`
- `fold`
- `reduce`
- `sum`
- `product`
- `find`
- `position`
- `any`
- `all`
- `collect`
- `partition`

### 7.3 设计约束

1. `map`、`filter` 等适配器默认惰性执行。
2. 明确迭代器是否单次消费。
3. 明确 `collect`、`sum`、`fold` 等终端操作的消费语义。
4. 不在全局修改 Iterator 或 Array 原型。
5. 支持标准 JavaScript Iterable。
6. 对无限迭代器和提前终止操作进行测试。
7. 不承诺在所有场景下比原生数组更快，必须以基准测试为准。

## 8. Std：类型安全工具

### 8.1 NonEmpty

```ts
type NonEmptyString = string & {
  readonly __brand: 'NonEmptyString'
}
```

通过构造器和运行时校验创建合法值。

建议扩展：

- `NonEmptyString`
- `NonEmptyArray<T>`
- `NonZero`
- `Positive`
- `Negative`
- `Bounded<T>`
- `FiniteNumber`

这些类型必须明确校验条件，并避免向使用者承诺无法由 TS 保证的安全性。

### 8.2 Range

提供明确的开区间和闭区间 API：

```ts
range(0, 10)
rangeInclusive(0, 10)
```

应明确上下界、步长、负步长和非法输入的行为。

### 8.3 Cow

模拟 Rust `Cow` 的拥有或借用状态：

```ts
type Cow<T> = { kind: 'borrowed'; value: T } | { kind: 'owned'; value: T }
```

这只是状态模型，不等于 Rust 的生命周期、借用检查或零拷贝保证。

### 8.4 资源管理

优先使用 TypeScript / JavaScript 原生的 `Disposable`、`Symbol.dispose`、`AsyncDisposable` 和 `Symbol.asyncDispose` 能力。

不自行模拟 Rust 的完整 RAII 或所有权检查。

## 9. Effect 适配层

`effect` 模块的职责是提供与 Effect 生态的互操作，而不是将 Effect 变成核心依赖。

候选能力：

- 将项目的 Result 转换为 Effect。
- 将 Effect 的成功与失败转换为项目约定的 Result。
- 对接 Option。
- 复用 Effect 的资源管理和异步计算能力。
- 为使用者提供明确的错误映射。

设计要求：

1. 独立安装。
2. 明确区分缺失值、失败和缺陷等不同语义。
3. 不把 Effect 的全部概念暴露到 core。
4. 不隐式启动运行时或吞掉错误。
5. 不保证所有类型转换都是无损的，必须记录转换规则。

## 10. Transform：语法扩展

此模块用于探索超出原生 TypeScript 表达能力的语法。

### 10.1 候选方向

- Rust 风格 `?` 错误传播。
- 更简洁的模式匹配语法。
- 特定的类型声明辅助语法。
- 编译期转换和代码生成。

### 10.2 实现边界

原生 TypeScript 不支持将自定义运算符直接定义为 `?`。

如果未来需要真正的 `?`，必须研究编译器转换或自定义构建流程，并明确：

- TypeScript 版本兼容性。
- IDE 诊断能力。
- Source map。
- 测试、覆盖率和调试体验。
- Vite、Vitest、tsc 等工具链兼容性。
- 转换前后类型检查的一致性。

在这些问题解决前，使用 `andThen`、`safeTry` 或 Generator 风格控制流作为替代。

## 11. 包管理与发布策略

### 11.1 包边界

建议支持细粒度安装：

```ts
import { Option, Result } from '@tsr/core'
import { caseOf, match, otherwise } from '@tsr/pattern'
import { Iter } from '@tsr/iter'
```

项目包名统一使用 `@tsr/*`，正式发布前仍需要检查 npm 命名可用性。

### 11.2 依赖策略

- Core 仅包含必要运行时代码。
- 使用模式匹配的包依赖 `@tsr/pattern`；只有需要底层特有 API 时才直接依赖 `ts-pattern`。
- Effect 只在适配包中引入。
- Neverthrow 作为设计参考或可选迁移适配对象，不与项目 Result 并行成为第二种标准类型。
- 避免无必要的运行时依赖和循环依赖。

### 11.3 发布要求

- ESM 优先。
- 明确 TypeScript 声明文件导出。
- 支持 `exports` 子路径导入。
- 提供稳定的公共 API。
- 避免导出内部实现细节。
- 评估 tree-shaking 与包体积。
- 为每个子包提供独立测试与构建。

## 12. 测试策略

### 12.1 单元测试

覆盖所有公开 API 的：

- 正常输入。
- 边界输入。
- 错误输入。
- 空值和缺失值。
- 嵌套类型。
- 泛型推导。
- 惰性执行和短路行为。

### 12.2 类型测试

使用专门的类型测试验证：

- `Option.map` 的返回类型。
- `Result.andThen` 的错误类型组合。
- `match` 的穷尽性。
- 品牌类型不可意外混用。
- 不合法 API 调用产生预期的类型错误。

不能仅凭运行时单元测试判断库的类型 API 是否正确。

### 12.3 兼容性测试

- 当前支持的 TypeScript 版本。
- ESM 导入。
- Node.js 环境。
- 常见测试和构建工具。
- 不同模块入口的依赖隔离。

### 12.4 性能测试

重点比较：

- Option / Result 与直接判别联合类型。
- 惰性 Iterator 与原生数组链式操作。
- 模式匹配与普通 switch。
- 品牌类型的运行时构造成本。
- 不同模块导入方式对打包产物的影响。

性能结论必须来自可复现的基准测试。

## 13. 开发阶段

### Phase 1：核心抽象（已完成）

交付：

- Option。
- Result。
- 基础类型守卫。
- 统一错误语义。
- 基础文档与类型测试。

验收标准：类型推导稳定、边界语义明确、核心无 Effect 强依赖。

### Phase 2：模式匹配

交付：

- match 适配。
- 穷尽性检查。
- 按实际需求实现具体的类型转换函数。

验收标准：公共 API 一致，不出现重复的 Result 体系。

### Phase 3：迭代器与类型工具

交付：

- 惰性 Iterator。
- Range。
- NonEmpty。
- NonZero。
- Cow 风格抽象。

验收标准：惰性行为、消费语义和运行时成本有明确测试。

### Phase 4：生态适配

交付：

- Effect 适配层。
- 必要的 neverthrow 互操作。
- 类型转换工具。
- 示例和迁移指南。

验收标准：适配包可选安装，不影响 core 的独立使用。

### Phase 5：语法扩展探索

交付候选：

- `?` 错误传播转换。
- 更丰富的模式匹配语法。
- 构建工具插件。

验收标准：工具链兼容性和调试体验达到可接受水平，否则不进入稳定版本。

## 14. 风险与应对

| 风险               | 应对措施                    |
| ------------------ | --------------------------- |
| Result 类型重复    | 只维护一个项目标准 Result   |
| Effect 依赖过重    | Effect 独立适配             |
| 模式匹配类型复杂   | 优先复用成熟实现            |
| 协议抽象过度       | 优先使用具体函数            |
| 惰性迭代器语义不清 | 明确单次消费和终端操作      |
| 品牌类型被绕过     | 配合运行时验证和文档        |
| 语法扩展影响工具链 | 独立 transform 包，后置实施 |
| 包体积增长         | 子路径导出和依赖审计        |

## 15. 第一版验收标准

第一版发布前必须满足：

- [ ] Option API 和 Result API 已统一。
- [ ] 错误传播与异常抛出语义有文档。
- [ ] `@tsr/pattern` 支持原始值匹配、自动非穷尽错误和链式复杂模式。
- [ ] 具体类型转换函数具备类型测试。
- [ ] Core 不强依赖 Effect。
- [ ] 子包之间不存在循环依赖。
- [ ] ESM 导入和类型声明正常。
- [ ] 单元测试和类型测试通过。
- [ ] 公开 API 均有示例。
- [ ] 有明确的版本兼容与发布策略。

## 16. 决策

### 16.1 已确定

1. `Option` 和 `Result` 使用私有构造器的类封装判别标签和值，公共 API 不暴露可变字段。
2. `None` 使用单例；`Option.some(undefined)` 仍表示存在值，与 `None` 区分。
3. `Result.andThen` 将前后错误类型合并为联合类型。`orElse` 允许恢复为不同成功类型，返回成功类型的联合，以便从 `Err` 直接恢复。
4. `@tsr/pattern` 以 `ts-pattern` 为实现，公开 `match`、`caseOf`、`otherwise`、`matchChain`、`P`、`isMatching` 和 `Pattern<T>` 作为稳定入口。
5. 首版 Iterator 仅实现同步迭代；异步场景使用原生 `AsyncIterator` / `AsyncIterable` 与 `Promise<Result<T, E>>`。
6. 首版不提供 neverthrow 互操作包；只有出现明确需求后再评估适配。
7. 最低 Node.js 版本为 `22.18.0`，最低 TypeScript 主版本为 `6.0`，与当前根配置一致。
8. 子包使用 `@tsr/*` 命名。
9. 稳定版不依赖自定义编译器转换；语法扩展继续留在独立的后续探索阶段。
10. Vite+、Vitest 和 TypeScript 作为仓库开发工具，不成为运行时 API 的组成部分。

### 16.2 后续评估

- 发布前确认 npm scope 的可用性及发布权限。
- 根据实际用户需求决定是否增加 neverthrow 适配。
- 只有标准 JavaScript / TypeScript 工具无法满足需求时，才重新评估编译器转换。

## 17. 总结

本项目的核心价值不在于重新实现 Effect、ts-pattern 和 neverthrow，而在于建立一套统一的 Rust-inspired TypeScript API。

优先完成 Option、Result 和模式匹配，确保类型安全、错误语义、依赖边界与模块设计一致；之后再扩展惰性迭代器、类型安全工具和语法转换。

最终目标是让 TypeScript 开发者获得更接近 Rust 的显式错误处理、可组合抽象和类型约束，同时保留 JavaScript / TypeScript 生态的兼容性与易用性。
