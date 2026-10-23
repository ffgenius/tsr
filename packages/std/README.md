# @tsr/std

提供经过运行时校验的非空值、数值约束和整数范围工具。构造器使用 `@tsr/core` 的 `Result` 表示校验成功或失败。

```ts
import {
  bounded,
  finiteNumber,
  nonEmptyArray,
  nonEmptyString,
  nonZero,
  negative,
  positive,
  range,
} from '@tsr/std'
```

## 非空值

`nonEmptyString(value)` 拒绝空字符串，但保留只含空白字符的字符串。`nonEmptyArray(value)` 成功时返回输入的浅拷贝并冻结数组；元素对象不会深度冻结。

```ts
const name = nonEmptyString('Ada')
if (name.isOk()) {
  name.unwrap() // NonEmptyString
}

const values = nonEmptyArray([1, 2])
if (values.isOk()) {
  values.unwrap() // readonly [number, ...number[]]
}
```

空值会以 `RangeError` 返回在 `Result` 中。`isNonEmptyString(value)` 和 `isNonEmptyArray(value)` 是可检查 `unknown` 的类型守卫；守卫只做类型收窄，不会复制或冻结输入。

## 数值约束

`nonZero`、`positive`、`negative` 和 `finiteNumber` 分别验证非零、正数、负数和有限数，并返回对应的品牌类型。数值约束只接受有限的 JS `number`；`NonZero` 排除正零和负零，正数和负数均不包含零。

```ts
const divisor = nonZero(4)
const ratio = bounded(0.5, 0, 1)
const count = finiteNumber(12)
```

`bounded(value, min, max)` 使用包含两端的区间，要求 `value`、`min`、`max` 均为有限数且 `min <= max`。校验失败时，构造器返回 `Err(RangeError)`；相应的 `isNonZero`、`isPositive`、`isNegative` 和 `isFiniteNumber` 守卫可直接验证 `unknown` 输入。

## 整数范围

`range` 返回可重复遍历的惰性 `Iterable<number>`，四种方法表示起点和终点是否包含：

```ts
import { Iter } from '@tsr/iter'
import { range } from '@tsr/std'

[...range.closed(1, 3)] // [1, 2, 3]
[...range.open(1, 3)] // [2]
[...range.closedOpen(1, 3)] // [1, 2]
[...range.openClosed(1, 3)] // [2, 3]

Iter.from(range.closed(1, 3)).sum() // 6
```

端点必须是安全整数，否则构造时抛出 `RangeError`。范围只按正向整数递增；起点大于或等于终点时，结果依照端点组合可能为空或只含该端点。当前不支持自定义步长或负向迭代。
