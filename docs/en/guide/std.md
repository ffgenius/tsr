# Type-safe Utilities

`@ffgenius/tsr` exports non-empty values, numeric constraints, and integer ranges. Constructors return `Result` from `@ffgenius/tsr`; branded types can be imported directly from the package entry point.

## Non-empty Values

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
let valid = name && !names.is_empty();
```

:::

## Numeric Constraints

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

Type guards narrow the static type without copying or converting the input. Constructors return validation failures as `Err(RangeError)`. Type assertions can bypass branded types, so they do not replace runtime validation of external data.

The `unique symbol` names in brackets are private brand markers in the package declarations and are not individually exported from the package entry point. Import the branded types directly instead of recreating their aliases.

## Integer Ranges

`range` is an exported object containing these four factories. Each returns a repeatable, lazy `Iterable<number>`. Endpoints must be safe integers or construction throws `RangeError`. Values advance by positive integers only; `start > end` produces an empty range, and equal endpoints produce a value only for `closed`.

::: code-group

```ts [TypeScript]
import { range } from '@ffgenius/tsr'
;[...range.closed(1, 3)] // [1, 2, 3]
```

```rust [Rust]
let closed: Vec<_> = (1..=3).collect(); // [1, 2, 3]
```

:::

Negative direction and custom steps are not supported. A range can be used with `for...of`, spread syntax, or `Iter.from`.

## API Reference

### Non-empty Values

| API                | TypeScript type                                                                                                  | Description                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `NonEmptyString`   | `string & { readonly [nonEmptyStringBrand]: true }`                                                              | Branded type for a non-empty string; obtain it through runtime construction or a guard.           |
| `NonEmptyArray<T>` | `readonly [T, ...T[]] & { readonly [nonEmptyArrayBrand]: true }`                                                 | Readonly array branded to contain at least one element.                                           |
| `isNonEmptyString` | `(value: unknown) => value is NonEmptyString`                                                                    | Checks for a string with `length > 0`; whitespace-only strings are valid.                         |
| `nonEmptyString`   | `(value: string) => Result<NonEmptyString, RangeError>`                                                          | Returns `Ok` when valid and `Err(RangeError)` for an empty string.                                |
| `isNonEmptyArray`  | `<T>(value: readonly T[]) => value is NonEmptyArray<T>`<br>`(value: unknown) => value is NonEmptyArray<unknown>` | Type guard that checks for an array with at least one item; it does not copy or freeze the input. |
| `nonEmptyArray`    | `<T>(value: readonly T[]) => Result<NonEmptyArray<T>, RangeError>`                                               | Returns a frozen shallow copy on success; element objects are not deep-frozen.                    |

### Numeric Constraints

| API                 | TypeScript type                                                                                                                    | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `NonZero`           | `number & { readonly [nonZeroBrand]: true }`                                                                                       | Branded type for finite numbers other than `0`; `-0` is also excluded.       |
| `Positive`          | `number & { readonly [positiveBrand]: true }`                                                                                      | Branded type for finite numbers strictly greater than `0`.                   |
| `Negative`          | `number & { readonly [negativeBrand]: true }`                                                                                      | Branded type for finite numbers strictly less than `0`.                      |
| `FiniteNumber`      | `number & { readonly [finiteNumberBrand]: true }`                                                                                  | Branded type for numbers accepted by `Number.isFinite`.                      |
| `Bounded<Min, Max>` | `number & { readonly [boundedBrand]: { min: Min; max: Max } }`                                                                     | Branded type for numbers in the inclusive interval `[Min, Max]`.             |
| `isFiniteNumber`    | `(value: unknown) => value is FiniteNumber`                                                                                        | Checks that the value is a finite `number`.                                  |
| `finiteNumber`      | `(value: number) => Result<FiniteNumber, RangeError>`                                                                              | Returns `Ok` for a finite number and `Err` for `NaN` / infinity.             |
| `isNonZero`         | `(value: unknown) => value is NonZero`                                                                                             | Checks for a finite number other than `0`.                                   |
| `nonZero`           | `(value: number) => Result<NonZero, RangeError>`                                                                                   | Creates a non-zero number; `0`, `-0`, `NaN`, and infinity fail.              |
| `isPositive`        | `(value: unknown) => value is Positive`                                                                                            | Checks for a finite number strictly greater than `0`.                        |
| `positive`          | `(value: number) => Result<Positive, RangeError>`                                                                                  | Creates a positive number; zero, negative, and non-finite values fail.       |
| `isNegative`        | `(value: unknown) => value is Negative`                                                                                            | Checks for a finite number strictly less than `0`.                           |
| `negative`          | `(value: number) => Result<Negative, RangeError>`                                                                                  | Creates a negative number; zero, positive, and non-finite values fail.       |
| `bounded`           | `<const Min extends number, const Max extends number>(value: number, min: Min, max: Max) => Result<Bounded<Min, Max>, RangeError>` | Requires finite bounds, `min <= max`, and a value in the inclusive interval. |

### Integer Ranges

| API                | TypeScript type                                    | Endpoints                                        |
| ------------------ | -------------------------------------------------- | ------------------------------------------------ |
| `range.closed`     | `(start: number, end: number) => Iterable<number>` | Includes both endpoints: `[start, end]`.         |
| `range.open`       | `(start: number, end: number) => Iterable<number>` | Excludes both endpoints: `(start, end)`.         |
| `range.closedOpen` | `(start: number, end: number) => Iterable<number>` | Includes start and excludes end: `[start, end)`. |
| `range.openClosed` | `(start: number, end: number) => Iterable<number>` | Excludes start and includes end: `(start, end]`. |
