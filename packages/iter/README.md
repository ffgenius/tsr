# @tsr/iter

同步、惰性、单次消费的迭代器。当前提供 `from`、`map`、`filter`、`take`、`find`、`any`、`all`、`collect`，以及标准迭代协议的 `next`、`return` 和 `[Symbol.iterator]`。`find` 返回 `@tsr/core` 的 `Option`。

```ts
import { Iter } from '@tsr/iter'

const values = Iter.from([1, 2, 3, 4])
  .filter((value) => value % 2 === 0)
  .map((value) => value * 10)
  .take(1)
  .collect()
// [20]，只读取源中的前两个元素。
```

## 输入与类型推导

`Iter.from<T>(values: Iterable<T>): Iter<T>` 接受同步可迭代对象，在首次调用 `next()` 时才获取源迭代器。

| 输入                              | 元素类型                      |
| --------------------------------- | ----------------------------- |
| `number[]`、`readonly number[]`   | `number`                      |
| `[1, 'two'] as const`             | `1 \| 'two'`                  |
| `Set<T>`                          | `T`                           |
| `Map<K, V>`                       | `[K, V]`                      |
| 字符串                            | `string`，按 Unicode 码点迭代 |
| `Uint8Array` 等 TypedArray        | 对应的 `number` 或 `bigint`   |
| 同步生成器、另一个 `Iter<T>`      | `T`                           |
| 实现 `[Symbol.iterator]()` 的对象 | 其迭代元素类型                |

普通对象、Promise、异步生成器，以及只有 `next()` 而没有 `[Symbol.iterator]()` 的迭代器不属于支持的输入。处理普通对象时可以先调用 `Object.entries()`、`Object.keys()` 或 `Object.values()`。

`map` 根据回调返回值推导元素类型，`filter` 支持类型守卫：

```ts
const numbers = Iter.from([1, 'two', 3])
  .filter((value): value is number => typeof value === 'number')
  .collect()
// number[]
```

## 惰性与单次消费

- `map`、`filter`、`take` 创建处理链时不读取源；`next()`、`find()`、`any()`、`all()`、`collect()` 和 `for...of` 驱动消费。
- `collect()` 收集当前剩余元素，再次调用返回空数组。
- 从同一 `Iter` 派生的链共享消费进度；它们不复制数据，也不会各自从头开始。需要重新遍历数组时，重新调用 `Iter.from(array)`。
- `take(n)` 最多从直接上游读取 `n` 个元素，不额外预读；`take(0)` 不初始化源。`n` 必须是非负整数，否则立即抛出 `RangeError`。
- `filter` 可能需要读取多个源元素才能产出一个匹配项。对无限源直接调用 `collect()`，或过滤条件始终不匹配时，处理可能永远无法结束。

```ts
const source = Iter.from([1, 2, 3])
const mapped = source.map((value) => value * 10)

mapped.next() // { done: false, value: 10 }
source.take(1).collect() // [2]
mapped.collect() // [30]
mapped.collect() // []
```

## 查找与短路判断

这三个操作立即从当前位置消费，直到得到结果或源耗尽。正常短路不会关闭源；触发短路的元素已被消费，后续调用从下一个元素继续。

| 操作              | 返回值      | 短路条件                 | 空源或已结束的源 |
| ----------------- | ----------- | ------------------------ | ---------------- |
| `find(predicate)` | `Option<T>` | 首个匹配项               | `None`           |
| `any(predicate)`  | `boolean`   | 首次匹配，返回 `true`    | `false`          |
| `all(predicate)`  | `boolean`   | 首次不匹配，返回 `false` | `true`           |

`find` 未找到时返回 `None`，找到 `undefined` 时返回 `Some(undefined)`；支持类型守卫，并根据守卫收窄返回的 `Option` 类型。

```ts
const source = Iter.from([1, 2, 3, 4])
source.find((value) => value > 1).unwrap() // 2
source.any((value) => value === 3) // true
source.all((value) => value > 0) // true，消费剩下的 4。
source.collect() // []

const number = Iter.from([1, 'two']).find(
  (value): value is number => typeof value === 'number'
)
// Option<number>
```

对无限源，只有能在有限步内触发短路的条件才会返回。无限源中不存在匹配项时，`find`、`any` 可能永远无法结束；所有元素始终匹配时，`all` 也可能永远无法结束。正常短路后若要释放源资源，可显式调用 `return()`。

## 提前退出与资源清理

`for...of` 中的 `break`、函数 `return` 和循环体抛错会调用迭代器的 `return()`。也可以手动调用 `iter.return()`，结束当前链并向上传递关闭，调用已经初始化的源迭代器的 `return()`。这会执行普通生成器中的 `finally` 清理，并影响共享该源的其他链。关闭后不能恢复消费；重复关闭不会再次清理。

尚未开始消费时调用 `return()` 不会初始化源。源未初始化时，也不会调用传入对象的 `return()`。

`take(n)` 正常达到上限时，只结束当前视图，保留源的剩余进度。因此，`take(n).collect()` 不会自动清理尚未耗尽的源，需要释放资源时应显式关闭：

```ts
function* values() {
  try {
    yield 1
    yield 2
  } finally {
    console.log('清理资源')
  }
}

const limited = Iter.from(values()).take(1)
try {
  limited.collect() // [1]，源仍可继续消费。
} finally {
  limited.return() // 即使 take 已结束，也会向上传递关闭。
}
```

源迭代或 `map`、`filter`、`find`、`any`、`all` 回调抛错时，当前链会关闭源并重新抛出原始错误；清理过程中产生的错误不会覆盖原始错误。显式调用 `return()` 时的清理错误会直接抛出，链仍保持关闭。

关闭依照 JavaScript 迭代协议调用源的 `return()`，不会继续读取源。资源清理应在 `finally` 中同步完成，避免在 `finally` 中继续 `yield`。

该包不提供异步迭代、完整 Rust Iterator API 或通用性能保证。
