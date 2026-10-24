# 惰性迭代器

`@ffgenius/tsr` 导出 `Iter<T>`。它实现同步 `IterableIterator<T>`，接受任何同步 `Iterable<T>`，不接受普通对象、Promise、异步可迭代对象或只有 `next()` 的迭代器。`Iter` 构造器为私有，使用 `Iter.from` 创建。

::: code-group

```ts [TypeScript]
import { Iter } from '@ffgenius/tsr'

const values = Iter.from([1, -2, 3, 4, 5])
  .filter((value) => value > 0)
  .map((value) => value * 2)
  .take(3)
  .collect()
// [2, 6, 8]
```

```rust [Rust]
let values: Vec<_> = [1, -2, 3, 4, 5]
    .into_iter()
    .filter(|value| *value > 0)
    .map(|value| value * 2)
    .take(3)
    .collect();
```

:::

::: code-group

```ts [TypeScript]
import { None, Some } from '@ffgenius/tsr'
import { Iter } from '@ffgenius/tsr'

const expanded = Iter.from([1, 2])
  .flatMap((value) => [value, value + 10])
  .collect()
const flattened = Iter.from([[1], [2]])
  .flatten()
  .collect()
const selected = Iter.from([1, 2, 3])
  .filterMap((value) => (value % 2 ? Some(value) : None))
  .collect()
const indexed = Iter.from(['a', 'b']).enumerate().collect()
const paired = Iter.from([1]).chain([2]).zip(['a', 'b']).collect()
```

```rust [Rust]
let expanded: Vec<_> = [1, 2].into_iter().flat_map(|value| [value, value + 10]).collect();
let flattened: Vec<_> = vec![vec![1], vec![2]].into_iter().flatten().collect();
let selected: Vec<_> = [1, 2, 3].into_iter().filter_map(|value| (value % 2 == 1).then_some(value)).collect();
let indexed: Vec<_> = ['a', 'b'].into_iter().enumerate().collect();
let paired: Vec<_> = [1].into_iter().chain([2]).zip(['a', 'b']).collect();
```

:::

::: code-group

```ts [TypeScript]
const found = Iter.from([1, 2, 3]).find((value) => value > 1)
const total = Iter.from([1, 2, 3]).fold(0, (sum, value) => sum + value)
const [evens] = Iter.from([1, 2, 3, 4]).partition((value) => value % 2 === 0)
```

```rust [Rust]
let found = [1, 2, 3].into_iter().find(|value| *value > 1);
let total = [1, 2, 3].into_iter().fold(0, |sum, value| sum + value);
let evens: Vec<_> = [1, 2, 3, 4].into_iter().filter(|value| value % 2 == 0).collect();
```

:::

::: code-group

```ts [TypeScript]
let cursor = Iter.from([1, 2])
const first = cursor.next()
cursor.return()
```

```rust [Rust]
let mut cursor = [1, 2, 3].into_iter();
let first = cursor.next();
drop(cursor);
```

:::

## 消费与清理

适配器在请求输出时才读取源。`find`、`position`、`any`、`all` 会短路，但短路不会自动关闭源；触发短路的元素已经消费，后续从下一项继续。`fold`、`reduce`、`sum`、`product`、`partition` 和 `collect` 会消费当前链剩余的有限输入。对无限源使用完整消费操作，或使用永远无法找到匹配项的筛选，可能无法结束。

`take(n)` 正常到达上限时只结束当前视图，上游仍可继续读取。若生成器等资源需要释放，请显式调用派生链的 `return()`；`for...of` 中的 `break` 也会依据 JavaScript 迭代协议调用 `return()`。关闭会沿派生链传播，并可能影响共享源的其他链。调用 `return()` 不会初始化尚未读取的源。

发生迭代或回调异常时，当前链会尝试关闭源并保留原始异常；关闭时的清理异常不会覆盖它。显式调用 `return()` 时，清理异常会直接抛出。`sum` 和 `product` 遵循 JavaScript `number` 运算，不额外检查安全整数或有限值。

```ts
function* values() {
  try {
    yield 1
    yield 2
  } finally {
    console.log('source closed')
  }
}

const limited = Iter.from(values()).take(1)
try {
  limited.collect() // [1]; the source remains open.
} finally {
  limited.return() // explicitly closes the generator.
}
```

Rust 的 `Iterator` 适配器也惰性执行，`next`、`find`、`position`、`any`、`all` 和终端收集操作都有对应方法。Rust 使用 `IntoIterator` 支持 `for` 循环，并在迭代器被丢弃时释放其拥有的资源；TSR 另提供显式 `return()` 传播上游清理。

## API 参考

`T` 表示当前迭代器产出的元素类型。适配器通常惰性读取并返回新的 `Iter`；终端操作从当前剩余位置读取数据。

| API                 | TypeScript 类型                                                                                                                                    | 行为                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Iter.from`         | `static from<T>(values: Iterable<T>): Iter<T>`                                                                                                     | 包装同步可迭代值；直到首次请求元素时才取得源迭代器。                                                                  |
| `next`              | `next(): IteratorResult<T>`                                                                                                                        | 读取下一项；耗尽或关闭后返回 `{ done: true, value: undefined }`。迭代或回调抛错时会尝试关闭当前链并重新抛出原始错误。 |
| `return`            | `return(): IteratorResult<T, undefined>`                                                                                                           | 结束当前链并向上游传播关闭；清理每个源至多一次，清理错误会抛出。                                                      |
| `[Symbol.iterator]` | `[Symbol.iterator](): IterableIterator<T>`                                                                                                         | 返回该迭代器本身，因此可用于 `for...of`。                                                                             |
| `map`               | `map<U>(mapper: (value: T) => U): Iter<U>`                                                                                                         | 消费时映射每个元素。                                                                                                  |
| `flatMap`           | `flatMap<U extends Iterable<unknown>>(mapper: (value: T) => U): Iter<U extends Iterable<infer V> ? V : never>`                                     | 消费时映射为同步可迭代对象并逐项展开一层。                                                                            |
| `flatten`           | `flatten<U extends Iterable<unknown>>(this: Iter<U>): Iter<U extends Iterable<infer V> ? V : never>`                                               | 逐项展开嵌套同步可迭代对象的一层。                                                                                    |
| `filter`            | `filter<S extends T>(predicate: (value: T) => value is S): Iter<S>`<br>`filter(predicate: (value: T) => boolean): Iter<T>`                         | 只产出匹配项；类型守卫重载会收窄输出类型。找下一项时可能读取多个源元素。                                              |
| `filterMap`         | `filterMap<U>(mapper: (value: T) => Option<U>): Iter<U>`                                                                                           | 将 `Some` 中的值产出，跳过 `None`；`Some(undefined)` 等假值仍保留。                                                   |
| `inspect`           | `inspect(observer: (value: T) => void): Iter<T>`                                                                                                   | 消费时调用观察回调，再产出原元素；不改变类型。                                                                        |
| `take`              | `take(count: number): Iter<T>`                                                                                                                     | 最多产出指定数量；要求非负整数，否则立即抛出 `RangeError`。达到上限不会自动关闭上游。                                 |
| `skip`              | `skip(count: number): Iter<T>`                                                                                                                     | 首次消费时跳过最多指定数量；要求非负整数，否则立即抛出 `RangeError`。                                                 |
| `stepBy`            | `stepBy(count: number): Iter<T>`                                                                                                                   | 保留首项，之后每隔 `count - 1` 项产出一项；要求正整数，否则抛出 `RangeError`。                                        |
| `enumerate`         | `enumerate(): Iter<[number, T]>`                                                                                                                   | 惰性添加从零开始的链内索引。                                                                                          |
| `chain`             | `chain<U>(values: Iterable<U>): Iter<T \| U>`                                                                                                      | 先产出当前源剩余项，再依次产出第二个源；两个源共享各自的消费进度。                                                    |
| `zip`               | `zip<U>(values: Iterable<U>): Iter<[T, U]>`                                                                                                        | 左右源逐项配对，任意一侧耗尽即结束。每轮先读取左侧，因此右侧已耗尽时左侧当轮元素仍会被消费。                          |
| `find`              | `find<S extends T>(predicate: (value: T) => value is S): Option<S>`<br>`find(predicate: (value: T) => boolean): Option<T>`                         | 返回首个匹配项；短路并消费该项，未找到返回 `None`。                                                                   |
| `position`          | `position(predicate: (value: T) => boolean): Option<number>`                                                                                       | 返回首个匹配项相对本次调用起点的索引；匹配项会被消费。                                                                |
| `any`               | `any(predicate: (value: T) => boolean): boolean`                                                                                                   | 找到匹配项即返回 `true` 并短路；空源返回 `false`。                                                                    |
| `all`               | `all(predicate: (value: T) => boolean): boolean`                                                                                                   | 找到不匹配项即返回 `false` 并短路；空源返回 `true`。                                                                  |
| `fold`              | `fold<U>(initial: U, reducer: (accumulator: U, value: T) => U): U`                                                                                 | 从初值累积并消费剩余元素；累积类型 `U` 可不同于 `T`。                                                                 |
| `reduce`            | `reduce(reducer: (accumulator: T, value: T) => T): Option<T>`                                                                                      | 以首项为初值累积；空源返回 `None`，非空返回 `Some`。                                                                  |
| `sum`               | `sum(this: Iter<number>): number`                                                                                                                  | 将剩余数字相加；空源返回 `0`。仅 `Iter<number>` 可调用。                                                              |
| `product`           | `product(this: Iter<number>): number`                                                                                                              | 将剩余数字相乘；空源返回 `1`。仅 `Iter<number>` 可调用。                                                              |
| `partition`         | `partition<S extends T>(predicate: (value: T) => value is S): [S[], Exclude<T, S>[]]`<br>`partition(predicate: (value: T) => boolean): [T[], T[]]` | 消费剩余元素，返回 `[匹配项, 不匹配项]`，两组都保留原有顺序。                                                         |
| `collect`           | `collect(): T[]`                                                                                                                                   | 将剩余元素收集为数组并消费至结束。                                                                                    |

`flatMap`、`flatten` 只展开一层；回调返回的 `Iterable` 必须同步。`chain` 与 `zip` 都接受一般的 `Iterable<U>`，不用先包装成 `Iter`。所有派生链共享源的消费进度，不会复制或重放数据。
