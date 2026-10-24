# Option 与 Result

`@ffgenius/tsr` 导出 `Option`、`Result`、便捷构造函数 `Some`、`None`、`Ok`、`Err`，以及对应的解包错误类。类型直接来自包入口：可以在源码和声明文件中查看真实定义，也可以用 `import type` 引用类类型。

## Option

`Option<T>` 用 `Some` 表示存在值、用 `None` 表示缺失值。`kind` 是公开的只读判别字段；内部值和构造器不公开。`Option.some(undefined)` 仍是 `Some`，而 `Option.fromNullable` 只将 `null` 和 `undefined` 转为 `None`。

### 组合与转换

::: code-group

```ts [TypeScript]
import { Option, Some } from '@ffgenius/tsr'

const name = Some(' Ada ')
  .map((value) => value.trim())
  .filter(Boolean)
const parsed = Option.fromNullable('42').andThen((value) =>
  Option.some(Number(value))
)
const asResult = name.okOr(new Error('missing'))
```

```rust [Rust]
let name = Some(" Ada ").map(str::trim).filter(|value| !value.is_empty());
let parsed = Some("42").and_then(|value| value.parse::<i32>().ok());
let as_result = name.ok_or("missing");
```

:::

### 提取与分支

::: code-group

```ts [TypeScript]
import { Option } from '@ffgenius/tsr'

const name = Option.fromNullable<string>(null)
const label = name.match({ some: (value) => value, none: () => 'Guest' })
const fallback = name.unwrapOr('Guest')
```

```rust [Rust]
let name: Option<&str> = None;
let label = name.unwrap_or("Guest");
```

:::

## Result

`Result<T, E>` 用 `Ok` 表示成功、用 `Err` 表示失败。`kind` 是公开的只读判别字段；值和错误通过方法访问。`andThen` 合并前后错误类型，`orElse` 将成功类型与恢复后的类型合并。

### 组合与转换

::: code-group

```ts [TypeScript]
import { Err, Ok, Option } from '@ffgenius/tsr'

const parsed = Ok(41).map((value) => value + 1)
const recovered = Err<RangeError, number>(new RangeError('invalid')).orElse(
  () => Ok(0)
)
const transposed = Ok(Option.some(7)).transpose()
```

```rust [Rust]
let parsed = Ok::<i32, &str>(41).map(|value| value + 1);
let recovered = Err::<i32, &str>("invalid").or(Ok(0));
let transposed: Option<Result<i32, &str>> = Ok(Some(7)).transpose();
```

:::

### 提取与分支

::: code-group

```ts [TypeScript]
import { Err } from '@ffgenius/tsr'

const failure = Err<RangeError, number>(new RangeError('invalid'))
const fallback = failure.unwrapOrElse((error) => error.message.length)
const label = failure.match({ ok: String, err: (error) => error.message })
const errorOption = failure.err()
```

```rust [Rust]
let failure: Result<i32, &str> = Err("invalid");
let fallback = failure.unwrap_or_else(|error| error.len() as i32);
let label = failure.map_err(str::to_owned).unwrap_err();
```

:::

`Result` 是同步值；异步操作可使用 `Promise<Result<T, E>>`。它不会自动捕获 Promise rejection。

两个错误类都继承原生 `Error`。`Option` 错误不携带值；`Result` 的解包错误会保留原始值为 `cause`。

Rust 的 `Option` / `Result` 是枚举，可在 `match` 中检查分支，也支持 `?` 传播兼容的错误。TSR 的包装对象提供相近的组合方法，但不会自动捕获异常或 Promise rejection。

## API 参考

### Option

| API                   | TypeScript 类型                                                                                                                | 说明                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `Option.some`         | `static some<T>(value: T): Option<T>`                                                                                          | 创建 `Some`；包括 `undefined` 在内的值都会保留。      |
| `Option.none`         | `static none<T = never>(): Option<T>`                                                                                          | 创建 `None`；实现返回共享的无值实例。                 |
| `Option.fromNullable` | `static fromNullable<T>(value: T \| null \| undefined): Option<NonNullable<T>>`                                                | `null` / `undefined` 返回 `None`，其他值返回 `Some`。 |
| `Some`                | `Some<T>(value: T): Option<T>`                                                                                                 | `Option.some` 的便捷函数。                            |
| `None`                | `Option<never>`                                                                                                                | 共享的 `None` 常量，可赋给任意 `Option<T>`。          |
| `kind`                | `readonly kind: 'some' \| 'none'`                                                                                              | 公开的判别字段。                                      |
| `map`                 | `map<U>(fn: (value: T) => U): Option<U>`                                                                                       | 对 `Some` 应用转换；`None` 保持为空。                 |
| `andThen`             | `andThen<U>(fn: (value: T) => Option<U>): Option<U>`                                                                           | 对 `Some` 串接另一个 `Option` 操作。                  |
| `filter`              | `filter<S extends T>(predicate: (value: T) => value is S): Option<S>`<br>`filter(predicate: (value: T) => boolean): Option<T>` | 条件不成立时返回 `None`；类型守卫重载会收窄元素类型。 |
| `flatten`             | `flatten<U>(this: Option<Option<U>>): Option<U>`                                                                               | 合并嵌套的两层 `Option`。                             |
| `zip`                 | `zip<U>(other: Option<U>): Option<[T, U]>`                                                                                     | 两边都有值时返回二元组，否则返回 `None`。             |
| `unwrap`              | `unwrap(): T`                                                                                                                  | 返回 `Some` 的值；`None` 抛出 `OptionUnwrapError`。   |
| `expect`              | `expect(message: string): T`                                                                                                   | 与 `unwrap` 相同，允许指定异常消息。                  |
| `unwrapOr`            | `unwrapOr(defaultValue: T): T`                                                                                                 | 无值时返回给定默认值。                                |
| `unwrapOrElse`        | `unwrapOrElse(defaultValue: () => T): T`                                                                                       | 无值时才调用默认值函数。                              |
| `okOr`                | `okOr<E>(error: E): Result<T, E>`                                                                                              | `Some` 转成 `Ok`，`None` 转成携带给定错误的 `Err`。   |
| `isSome`              | `isSome(): this is Option<T> & { readonly kind: 'some' }`                                                                      | 类型守卫，收窄 `kind` 为 `'some'`。                   |
| `isNone`              | `isNone(): this is Option<T> & { readonly kind: 'none' }`                                                                      | 类型守卫，收窄 `kind` 为 `'none'`。                   |
| `match`               | `match<U>(cases: { some: (value: T) => U; none: () => U }): U`                                                                 | 对两个分支执行回调，并推导共同返回类型。              |

### Result

| API            | TypeScript 类型                                                     | 说明                                             |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `Result.ok`    | `static ok<T, E = never>(value: T): Result<T, E>`                   | 创建成功结果。                                   |
| `Result.err`   | `static err<E, T = never>(error: E): Result<T, E>`                  | 创建失败结果。                                   |
| `Ok`           | `Ok<T, E = never>(value: T): Result<T, E>`                          | `Result.ok` 的便捷函数。                         |
| `Err`          | `Err<E, T = never>(error: E): Result<T, E>`                         | `Result.err` 的便捷函数。                        |
| `kind`         | `readonly kind: 'ok' \| 'err'`                                      | 公开的判别字段。                                 |
| `map`          | `map<U>(fn: (value: T) => U): Result<U, E>`                         | 只转换 `Ok` 的值；`Err` 保留原错误。             |
| `mapErr`       | `mapErr<F>(fn: (error: E) => F): Result<T, F>`                      | 只转换 `Err` 的错误；`Ok` 保留原值。             |
| `andThen`      | `andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, E \| F>`  | 串接可能失败的操作，并合并错误类型。             |
| `orElse`       | `orElse<U, F>(fn: (error: E) => Result<U, F>): Result<T \| U, F>`   | 从失败分支恢复；成功值类型可能变为 `T \| U`。    |
| `unwrap`       | `unwrap(): T`                                                       | 返回 `Ok` 的值；`Err` 抛出 `ResultUnwrapError`。 |
| `expect`       | `expect(message: string): T`                                        | 与 `unwrap` 相同，允许指定异常消息。             |
| `unwrapOr`     | `unwrapOr(defaultValue: T): T`                                      | `Err` 时返回给定默认值。                         |
| `unwrapOrElse` | `unwrapOrElse(defaultValue: (error: E) => T): T`                    | `Err` 时用错误计算默认值。                       |
| `unwrapErr`    | `unwrapErr(): E`                                                    | 返回错误；`Ok` 时抛出 `ResultUnwrapError`。      |
| `isOk`         | `isOk(): this is Result<T, E> & { readonly kind: 'ok' }`            | 类型守卫，收窄 `kind` 为 `'ok'`。                |
| `isErr`        | `isErr(): this is Result<T, E> & { readonly kind: 'err' }`          | 类型守卫，收窄 `kind` 为 `'err'`。               |
| `ok`           | `ok(): Option<T>`                                                   | 成功值转为 `Some`，错误转为 `None`。             |
| `err`          | `err(): Option<E>`                                                  | 错误转为 `Some`，成功转为 `None`。               |
| `match`        | `match<U>(cases: { ok: (value: T) => U; err: (error: E) => U }): U` | 对成功和失败分支执行回调。                       |
| `transpose`    | `transpose<U>(this: Result<Option<U>, E>): Option<Result<U, E>>`    | 转换嵌套的 `Result<Option<U>, E>`。              |
| `flatten`      | `flatten<U, F>(this: Result<Result<U, F>, E>): Result<U, E \| F>`   | 合并嵌套的 `Result`，并合并错误类型。            |

### 错误类型

| API                       | TypeScript 类型                                          | 说明                                                                    |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `OptionUnwrapError`       | `new OptionUnwrapError(message: string)`                 | `Option.unwrap()` 或 `expect()` 在 `None` 时抛出。                      |
| `ResultUnwrapError`       | `new ResultUnwrapError(message: string, error: unknown)` | `Result` 解包方向错误时抛出；原值可从 `error` 与标准 `cause` 属性读取。 |
| `ResultUnwrapError.error` | `readonly error: unknown`                                | 导致解包错误的原始错误值或成功值。                                      |
