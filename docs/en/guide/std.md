# Type-safe Utilities

`@tsr/std` provides branded types created through constructors and runtime checks, along with lazy integer ranges.

## Non-empty Values and Numeric Constraints

`nonEmptyString`, `nonEmptyArray`, `nonZero`, `positive`, `negative`, `finiteNumber`, and `bounded` return `Result<Value, RangeError>`. Their corresponding `is...` functions can be used as type guards. On success, `nonEmptyArray` returns a frozen shallow copy.

::: code-group

```ts [TypeScript]
import { nonZero, positive } from '@tsr/std'

const retries = positive(3).map((count) => count + 1)
const divisor = nonZero(2).map((value) => 10 / value)
```

```rust [Rust]
use std::num::NonZeroU32;

let retries = NonZeroU32::new(3).map(|count| count.get() + 1);
let divisor = NonZeroU32::new(2).map(|value| 10 / value.get());
```

:::

Rust's standard library has types such as `NonZeroU32`; other constraints depend on the type and validation rules. TSR branded types also require runtime construction or validation and do not replace validation of external input.

## Integer Ranges

`range.closed`, `range.open`, `range.closedOpen`, and `range.openClosed` return a repeatable `Iterable<number>`. Endpoints must be safe integers, ranges only move forward, and a start greater than the end produces an empty range.

::: code-group

```ts [TypeScript]
import { range } from '@tsr/std'

const values = [...range.closedOpen(0, 4)]
```

```rust [Rust]
let values = (0..4).collect::<Vec<_>>();
```

:::

Rust's `0..4` range is start-inclusive and end-exclusive. Rust range endpoints, stepping, and type constraints do not exactly match TSR's four factories.
