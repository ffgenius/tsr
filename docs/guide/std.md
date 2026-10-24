# 类型安全工具

`@ffgenius/tsr` 导出非空值、数值约束和整数范围。构造器返回 `@ffgenius/tsr` 的 `Result`，各品牌类型可从包入口直接导入。

## 非空值

::: code-group

```ts [TypeScript]
import {
  isNonEmptyArray,
  isNonEmptyString,
  nonEmptyArray,
  nonEmptyString,
} from '@ffgenius/tsr'

const name = nonEmptyString('Ada')
const names = nonEmptyArray(['Ada', 'Lin'])
const valid = isNonEmptyString('Ada') && isNonEmptyArray(['Ada'])
```

```rust [Rust]
let name = !"Ada".is_empty();
let names = vec!["Ada", "Lin"];
let valid_name = name && !names.is_empty();
```

:::

## 数值约束

::: code-group

```ts [TypeScript]
import { bounded, finiteNumber, isPositive } from '@ffgenius/tsr'

const finite = finiteNumber(3.5)
const unit = bounded(0.5, 0, 1)
const positiveValue = isPositive(2)
```

```rust [Rust]
let finite = 3.5_f64.is_finite();
let non_zero = std::num::NonZeroU32::new(4).is_some();
let in_range = (0.0_f64..=1.0).contains(&0.5);
```

:::

类型守卫只收窄静态类型，不复制或转换输入。构造器失败会在 `Err` 中返回 `RangeError`；这些品牌类型可被类型断言绕过，因此不替代对外部数据的运行时验证。

上面方括号中的 `unique symbol` 名称是包声明内部的品牌标记，不从包入口单独导出；使用者应直接导入品牌类型，不要自行重建类型别名。

## 整数范围

`range` 是包含以上四个工厂的导出对象；每个工厂都返回可重复遍历的惰性 `Iterable<number>`。端点必须是安全整数，否则创建范围时抛出 `RangeError`。只按正向整数递增；`start > end` 时为空，端点相等时仅 `closed` 产生该值。

::: code-group

```ts [TypeScript]
import { range } from '@ffgenius/tsr'
;[...range.closed(1, 3)] // [1, 2, 3]
```

```rust [Rust]
let closed: Vec<_> = (1..=3).collect(); // [1, 2, 3]
```

:::

当前不支持负向范围或自定义步长。范围可直接用于 `for...of`、展开语法，或传给 `Iter.from`。

## API 参考

### 非空值

| API                | TypeScript 类型                                                                                                  | 说明                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `NonEmptyString`   | `string & { readonly [nonEmptyStringBrand]: true }`                                                              | 非空字符串的品牌类型；类型只能通过运行时构造或守卫获得。 |
| `NonEmptyArray<T>` | `readonly [T, ...T[]] & { readonly [nonEmptyArrayBrand]: true }`                                                 | 至少含一个元素的只读数组品牌类型。                       |
| `isNonEmptyString` | `(value: unknown) => value is NonEmptyString`                                                                    | 检查字符串且 `length > 0`；空白字符串有效。              |
| `nonEmptyString`   | `(value: string) => Result<NonEmptyString, RangeError>`                                                          | 有效时返回 `Ok`；空字符串返回 `Err(RangeError)`。        |
| `isNonEmptyArray`  | `<T>(value: readonly T[]) => value is NonEmptyArray<T>`<br>`(value: unknown) => value is NonEmptyArray<unknown>` | 类型守卫，只检查数组且长度大于零，不复制或冻结输入。     |
| `nonEmptyArray`    | `<T>(value: readonly T[]) => Result<NonEmptyArray<T>, RangeError>`                                               | 成功时创建并冻结浅拷贝；数组元素对象不会深度冻结。       |

### 数值约束

| API                 | TypeScript 类型                                                                                                                    | 说明                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `NonZero`           | `number & { readonly [nonZeroBrand]: true }`                                                                                       | 有限且不等于 `0` 的数字品牌类型；`-0` 也会被排除。                |
| `Positive`          | `number & { readonly [positiveBrand]: true }`                                                                                      | 有限且严格大于 `0` 的数字品牌类型。                               |
| `Negative`          | `number & { readonly [negativeBrand]: true }`                                                                                      | 有限且严格小于 `0` 的数字品牌类型。                               |
| `FiniteNumber`      | `number & { readonly [finiteNumberBrand]: true }`                                                                                  | 通过 `Number.isFinite` 检查的数字品牌类型。                       |
| `Bounded<Min, Max>` | `number & { readonly [boundedBrand]: { min: Min; max: Max } }`                                                                     | 含端点区间 `[Min, Max]` 中的数字品牌类型。                        |
| `isFiniteNumber`    | `(value: unknown) => value is FiniteNumber`                                                                                        | 检查 `number` 且为有限值。                                        |
| `finiteNumber`      | `(value: number) => Result<FiniteNumber, RangeError>`                                                                              | 有限值返回 `Ok`，`NaN` / 无穷返回 `Err`。                         |
| `isNonZero`         | `(value: unknown) => value is NonZero`                                                                                             | 检查有限数字且不等于 `0`。                                        |
| `nonZero`           | `(value: number) => Result<NonZero, RangeError>`                                                                                   | 创建非零数字；`0`、`-0`、`NaN` 和无穷失败。                       |
| `isPositive`        | `(value: unknown) => value is Positive`                                                                                            | 检查有限数字且严格大于 `0`。                                      |
| `positive`          | `(value: number) => Result<Positive, RangeError>`                                                                                  | 创建正数；零、负数及非有限数失败。                                |
| `isNegative`        | `(value: unknown) => value is Negative`                                                                                            | 检查有限数字且严格小于 `0`。                                      |
| `negative`          | `(value: number) => Result<Negative, RangeError>`                                                                                  | 创建负数；零、正数及非有限数失败。                                |
| `bounded`           | `<const Min extends number, const Max extends number>(value: number, min: Min, max: Max) => Result<Bounded<Min, Max>, RangeError>` | 检查有限上下界、`min <= max`，并要求 `value` 在包含两端的区间内。 |

### 整数范围

| API                | TypeScript 类型                                    | 起止端点                            |
| ------------------ | -------------------------------------------------- | ----------------------------------- |
| `range.closed`     | `(start: number, end: number) => Iterable<number>` | 包含起点与终点 `[start, end]`。     |
| `range.open`       | `(start: number, end: number) => Iterable<number>` | 排除起点与终点 `(start, end)`。     |
| `range.closedOpen` | `(start: number, end: number) => Iterable<number>` | 包含起点、排除终点 `[start, end)`。 |
| `range.openClosed` | `(start: number, end: number) => Iterable<number>` | 排除起点、包含终点 `(start, end]`。 |
