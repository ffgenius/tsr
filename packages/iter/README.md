# @tsr/iter

同步、惰性、单次消费的迭代器。当前提供 `from`、`map`、`flatMap`、`flatten`、`filter`、`filterMap`、`inspect`、`take`、`skip`、`enumerate`、`chain`、`zip`、`find`、`any`、`all`、`fold`、`reduce`、`collect`，以及标准迭代协议的 `next`、`return` 和 `[Symbol.iterator]`。`find` 和 `reduce` 返回 `@tsr/core` 的 `Option`，`filterMap` 的回调也使用该类型。

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

- `map`、`flatMap`、`flatten`、`filter`、`filterMap`、`inspect`、`take`、`skip`、`enumerate`、`chain`、`zip` 创建处理链时不读取源；`next()`、`find()`、`any()`、`all()`、`fold()`、`reduce()`、`collect()` 和 `for...of` 驱动消费。
- `collect()` 收集当前剩余元素，再次调用返回空数组。
- 从同一 `Iter` 派生的链共享消费进度；它们不复制数据，也不会各自从头开始。需要重新遍历数组时，重新调用 `Iter.from(array)`。
- `take(n)` 最多从直接上游读取 `n` 个元素，不额外预读；`take(0)` 不初始化源。`n` 必须是非负整数，否则立即抛出 `RangeError`。
- `skip(n)` 在首次消费时从直接上游跳过最多 `n` 项，之后正常产出剩余元素，不会重复跳过。`n` 的校验规则与 `take` 一致；`skip(0)` 不跳过任何元素。
- `enumerate()` 惰性产出 `[number, T]` 元组。每条派生链从 0 编号，只统计该链产出的元素；部分消费后编号连续。
- `filter` 和 `filterMap` 可能需要读取多个源元素才能产出一个匹配项。对无限源直接调用 `collect()`，或过滤条件始终不匹配时，处理可能永远无法结束。

```ts
const source = Iter.from([1, 2, 3])
const mapped = source.map((value) => value * 10)

mapped.next() // { done: false, value: 10 }
source.take(1).collect() // [2]
mapped.collect() // [30]
mapped.collect() // []
```

`skip` 与 `enumerate` 的调用顺序决定编号含义：

```ts
Iter.from(['a', 'b', 'c']).skip(1).enumerate().collect()
// [[0, 'b'], [1, 'c']]
Iter.from(['a', 'b', 'c']).enumerate().skip(1).collect()
// [[1, 'b'], [2, 'c']]
```

## 转换并筛选与观察元素

`filterMap<U>(mapper: (value: T) => Option<U>): Iter<U>` 在消费时转换并筛选元素：回调返回 `Some(value)` 时产出该值，返回 `None` 时跳过。`Some(undefined)`、`Some(null)` 和其他假值都被保留。输出类型根据回调返回的 `Option` 推导。

`inspect(observer: (value: T) => void): Iter<T>` 在元素经过当前链位置时调用回调，然后继续产出同一个元素。回调返回值被忽略，元素类型保持不变。它不会复制或冻结对象；回调修改对象时，修改会反映到后续操作中。

```ts
import { Option } from '@tsr/core'

const seen: string[] = []
const names = Iter.from([{ name: 'Ada' }, { name: null }, { name: 'Lin' }])
  .filterMap((user) => Option.fromNullable(user.name))
  .inspect((name) => seen.push(name))
  .take(1)
  .collect()
// names 和 seen 都是 ['Ada']，其余源元素未读取。
```

`inspect` 放在筛选之前会观察筛选所读取的每个元素，放在筛选之后只会观察保留下来的元素。对无限源使用 `filterMap` 且始终返回 `None` 时，即使后接 `take(1)`，也可能永远无法产出结果。

## 展开可迭代对象

`flatMap(mapper)` 在消费外层元素时调用回调，按顺序产出回调返回的同步可迭代对象中的元素。`flatten()` 直接展开外层的每个可迭代元素。两者都只展开一层，支持数组、只读元组、字符串、Set、Map、TypedArray、同步生成器和 `Iter`；字符串按 Unicode 码点展开。

```ts
Iter.from([1, 2])
  .flatMap((value) => [value, value * 10])
  .collect()
// [1, 10, 2, 20]
Iter.from([[1, 2], [], [3]])
  .flatten()
  .collect()
// [1, 2, 3]
Iter.from([[[1]], [[2]]])
  .flatten()
  .collect()
// [[1], [2]]，只展开一层。
Iter.from([[1], ['two']] as const)
  .flatten()
  .collect()
// (1 | 'two')[]
```

创建链时不会调用回调或初始化内外层迭代器。每次只消费当前内层，内层耗尽后才读取下一项外层数据；空内层被跳过，`undefined`、`null` 和假值元素被保留。部分消费后继续使用同一条展开链，会先继续当前内层。从外层源直接消费时，会跳过对应的外层项，不影响展开链已持有的内层进度。

`take(n)` 达到上限和 `find` 等操作正常短路时，内外层保持可继续消费；需要清理时应保留展开链或其下游并调用 `return()`。显式关闭、循环提前退出或迭代异常会先关闭当前活动内层，再关闭外层，不初始化尚未访问的内层。即使内层清理抛错，也会尝试关闭外层；显式关闭时保留先发生的清理错误，迭代或回调抛错时保留原始错误。正常耗尽的内层不会额外调用 `return()`。

只有同步可迭代对象可以展开，Promise、AsyncIterable 和仅有 `next()` 的 Iterator 不受支持。无限内层会阻止后续外层项被访问；无限外层持续产生空内层时，后接 `take(1)` 也可能无法结束。

## 连接与配对

`chain<U>(values: Iterable<U>): Iter<T | U>` 先产出当前源的剩余元素，耗尽后才获取并消费第二个源。两个源的元素类型可以不同，结果推导为联合类型。

`zip<U>(values: Iterable<U>): Iter<[T, U]>` 每次先读取左侧，再读取右侧，产出一个元组；任意一侧耗尽，配对链就永久结束。左侧先结束时，不再读取或初始化右侧；右侧先结束时，本轮已经读取的一个左侧元素无法配对，仍会被消费。

```ts
Iter.from([1, 2]).chain(['three']).collect()
// [1, 2, 'three']，类型为 (number | string)[]。
Iter.from(['Ada', 'Lin']).zip([10, 20]).collect()
// [['Ada', 10], ['Lin', 20]]，类型为 [string, number][]。

const left = Iter.from([1, 2, 3])
left.zip(['a']).collect() // [[1, 'a']]，2 已在第二轮读取。
left.collect() // [3]
```

两者均接受同步可迭代对象，创建组合链时不初始化第二个源。传入已有 `Iter` 时共享其当前消费进度，直接消费任意一侧也会影响组合链后续结果。`take` 达到上限或查找正常短路时保留剩余进度；`zip` 正常结束时也不会自动关闭尚有剩余元素的源。需要清理时，保留组合链或其下游并调用 `return()`，即使该链已经结束也可关闭源。

显式关闭、循环提前退出或迭代异常会尝试关闭两个源，不初始化尚未访问的第二个源。显式关闭按左、右顺序尝试清理；即使左侧清理抛错，也会尝试右侧，并保留先发生的清理错误。迭代或下游回调抛错时保留原始错误。

`chain` 的第一源无限时不会访问第二源；`zip` 在任意一侧于有限步内耗尽时结束。两个源都无限时，应通过 `take` 等操作限制消费范围。

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

## 累积剩余元素

`fold<U>(initial: U, reducer: (accumulator: U, value: T) => U): U` 从当前位置依次消费剩余元素，将每次回调的返回值作为下一次的累积值。累积值类型可以与元素类型不同，也可以显式指定泛型。

```ts
const total = Iter.from([1, 2, 3, 4])
  .skip(1)
  .take(2)
  .fold(0, (sum, value) => sum + value)
// 5

const labels = Iter.from([10, 20])
  .enumerate()
  .fold<string[]>([], (values, [index, value]) => [
    ...values,
    `${index}:${value}`,
  ])
// ['0:10', '1:20']
```

空源、已耗尽或已关闭的链直接返回传入的初始值，不调用回调。`fold` 消费完当前链后，再次消费该链不会得到元素。它不会额外关闭 `take` 限制后仍有剩余元素的上游；需要释放资源时可显式调用 `return()`。对无限源直接调用 `fold` 可能永远无法结束，可先通过 `take` 限制消费范围。

`reduce(reducer: (accumulator: T, value: T) => T): Option<T>` 使用当前剩余元素中的首项作为初始值，随后按顺序累积；回调的参数和返回值类型都是元素类型 `T`。需要指定初始值或使用不同累积类型时，使用 `fold`。

```ts
Iter.from([1, 2, 3]).reduce((sum, value) => sum + value) // Some(6)
Iter.from<number>([]).reduce((sum, value) => sum + value) // None
Iter.from([undefined]).reduce(() => undefined) // Some(undefined)
```

空源、已耗尽或已关闭的链返回 `None`；单元素源直接返回 `Some(首项)`，以上情况都不会调用回调。`reduce` 与 `fold` 一样消费当前链的剩余元素，并遵循相同的无限源与资源清理规则。

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

源或内层迭代，以及 `map`、`flatMap`、`filter`、`filterMap`、`inspect`、`find`、`any`、`all`、`fold`、`reduce` 回调抛错时，当前链会关闭源并重新抛出原始错误；清理过程中产生的错误不会覆盖原始错误。显式调用 `return()` 时的清理错误会直接抛出，链仍保持关闭。

关闭依照 JavaScript 迭代协议调用源的 `return()`，不会继续读取源。资源清理应在 `finally` 中同步完成，避免在 `finally` 中继续 `yield`。

该包不提供异步迭代、完整 Rust Iterator API 或通用性能保证。
