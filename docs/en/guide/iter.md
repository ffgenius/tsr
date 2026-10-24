# Lazy Iterators

`Iter.from` in `@tsr/iter` accepts a synchronous `Iterable<T>`. Adapters read values on demand, and terminal operations consume the remaining values at the current position.

::: code-group

```ts [TypeScript]
import { Iter } from '@tsr/iter'

const values = Iter.from([1, -2, 3, 4, 5])
  .filter((value) => value > 0)
  .map((value) => value * 2)
  .take(3)
  .collect()
```

```rust [Rust]
let values = [1, -2, 3, 4, 5]
    .into_iter()
    .filter(|value| *value > 0)
    .map(|value| value * 2)
    .take(3)
    .collect::<Vec<_>>();
```

:::

## Operations

Adapters include `map`, `flatMap`, `flatten`, `filter`, `filterMap`, `inspect`, `take`, `skip`, `stepBy`, `enumerate`, `chain`, and `zip`. Terminal operations include `find`, `position`, `any`, `all`, `fold`, `reduce`, `sum`, `product`, `partition`, and `collect`.

`find`, `position`, and `reduce` return `Option` from `@tsr/core`; the `filterMap` callback also returns `Option`. `sum` and `product` accept only `number` elements and return `0` and `1` for empty input, respectively.

## Consumption and Cleanup

`Iter` follows single-consumption semantics. Derived iterators share source progress, and terminal operations consume only the remaining values. `any`, `all`, `find`, and `position` short-circuit. When `take` reaches its limit, the upstream source remains available; call `return()` explicitly when a generator or other resource should be closed. See the [design document](../../design) for additional consumption and cleanup details.
