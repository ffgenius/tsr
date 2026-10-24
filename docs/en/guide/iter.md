# Lazy Iterators

`@ffgenius/tsr` exports `Iter<T>`, which implements the synchronous `IterableIterator<T>` protocol. It accepts any synchronous `Iterable<T>`, but not plain objects, Promises, async iterables, or iterators that only implement `next()`. The constructor is private; create instances with `Iter.from`.

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

## Consumption and cleanup

Adapters read their source only when output is requested. `find`, `position`, `any`, and `all` short-circuit but do not automatically close the source; the item that triggered the short-circuit is consumed, and later reads continue with the next item. `fold`, `reduce`, `sum`, `product`, `partition`, and `collect` consume the remaining finite input. Full-consumption operations on infinite sources, or filters that can never find a match, may not finish.

When `take(n)` reaches its limit, it ends only the current view and leaves upstream available. To release a generator or another resource, call `return()` on the derived chain; `break` in a `for...of` loop also invokes `return()` through the JavaScript iterator protocol. Closing propagates through adapters and can affect other chains sharing the source. Calling `return()` does not initialize a source that has not been read.

If iteration or a callback throws, the current chain attempts to close its sources and preserves the original error; cleanup errors do not replace it. An error thrown by an explicit `return()` is propagated. `sum` and `product` use JavaScript `number` arithmetic and do not check safety or finiteness.

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

Rust's `Iterator` adapters are lazy too, and `next`, `find`, `position`, `any`, `all`, and terminal collection have corresponding methods. Rust uses `IntoIterator` for `for` loops and releases owned resources when an iterator is dropped; TSR additionally exposes `return()` to propagate upstream cleanup.

## API Reference

`T` is the element type produced by the current iterator. Adapters are generally lazy and return a new `Iter`; terminal operations read from the current remaining position.

| API                 | TypeScript type                                                                                                                                    | Behavior                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Iter.from`         | `static from<T>(values: Iterable<T>): Iter<T>`                                                                                                     | Wraps a synchronous iterable; obtains its source iterator on the first read.                                                                                                                     |
| `next`              | `next(): IteratorResult<T>`                                                                                                                        | Reads the next item; after exhaustion or closure, returns `{ done: true, value: undefined }`. If iteration or a callback throws, it attempts to close the chain and rethrows the original error. |
| `return`            | `return(): IteratorResult<T, undefined>`                                                                                                           | Ends this chain and propagates closure upstream; each source is closed at most once. Cleanup errors are thrown.                                                                                  |
| `[Symbol.iterator]` | `[Symbol.iterator](): IterableIterator<T>`                                                                                                         | Returns this iterator so it can be used in `for...of`.                                                                                                                                           |
| `map`               | `map<U>(mapper: (value: T) => U): Iter<U>`                                                                                                         | Maps each value as it is consumed.                                                                                                                                                               |
| `flatMap`           | `flatMap<U extends Iterable<unknown>>(mapper: (value: T) => U): Iter<U extends Iterable<infer V> ? V : never>`                                     | Maps each consumed value to a synchronous iterable and flattens one level.                                                                                                                       |
| `flatten`           | `flatten<U extends Iterable<unknown>>(this: Iter<U>): Iter<U extends Iterable<infer V> ? V : never>`                                               | Flattens one level of nested synchronous iterables.                                                                                                                                              |
| `filter`            | `filter<S extends T>(predicate: (value: T) => value is S): Iter<S>`<br>`filter(predicate: (value: T) => boolean): Iter<T>`                         | Emits only matches; the type-guard overload narrows the output. Finding the next output may read several source items.                                                                           |
| `filterMap`         | `filterMap<U>(mapper: (value: T) => Option<U>): Iter<U>`                                                                                           | Emits values in `Some` and skips `None`; falsy values such as `Some(undefined)` are preserved.                                                                                                   |
| `inspect`           | `inspect(observer: (value: T) => void): Iter<T>`                                                                                                   | Calls an observer as each value is consumed, then emits the original value without changing its type.                                                                                            |
| `take`              | `take(count: number): Iter<T>`                                                                                                                     | Emits at most the requested count; requires a non-negative integer or immediately throws `RangeError`. Reaching the limit does not close upstream.                                               |
| `skip`              | `skip(count: number): Iter<T>`                                                                                                                     | Skips up to the requested count when consumption begins; requires a non-negative integer or immediately throws `RangeError`.                                                                     |
| `stepBy`            | `stepBy(count: number): Iter<T>`                                                                                                                   | Keeps the first item, then emits every `count`th item; requires a positive integer or throws `RangeError`.                                                                                       |
| `enumerate`         | `enumerate(): Iter<[number, T]>`                                                                                                                   | Lazily pairs each value with a chain-local index starting at zero.                                                                                                                               |
| `chain`             | `chain<U>(values: Iterable<U>): Iter<T \| U>`                                                                                                      | Emits the remaining items from this source, then the second source; each source retains its shared consumption position.                                                                         |
| `zip`               | `zip<U>(values: Iterable<U>): Iter<[T, U]>`                                                                                                        | Pairs items from both sources and ends when either side is exhausted. Each step reads the left side first, so that item is consumed if the right side has already ended.                         |
| `find`              | `find<S extends T>(predicate: (value: T) => value is S): Option<S>`<br>`find(predicate: (value: T) => boolean): Option<T>`                         | Returns the first match; short-circuits and consumes it, or returns `None`.                                                                                                                      |
| `position`          | `position(predicate: (value: T) => boolean): Option<number>`                                                                                       | Returns the first match's index relative to this call; the matching item is consumed.                                                                                                            |
| `any`               | `any(predicate: (value: T) => boolean): boolean`                                                                                                   | Returns `true` and short-circuits on the first match; returns `false` for an empty source.                                                                                                       |
| `all`               | `all(predicate: (value: T) => boolean): boolean`                                                                                                   | Returns `false` and short-circuits on the first non-match; returns `true` for an empty source.                                                                                                   |
| `fold`              | `fold<U>(initial: U, reducer: (accumulator: U, value: T) => U): U`                                                                                 | Folds the remaining elements from an initial value; accumulator type `U` may differ from `T`.                                                                                                    |
| `reduce`            | `reduce(reducer: (accumulator: T, value: T) => T): Option<T>`                                                                                      | Uses the first item as the accumulator; returns `None` for an empty source and `Some` otherwise.                                                                                                 |
| `sum`               | `sum(this: Iter<number>): number`                                                                                                                  | Adds remaining numbers; returns `0` for an empty source. Only callable on `Iter<number>`.                                                                                                        |
| `product`           | `product(this: Iter<number>): number`                                                                                                              | Multiplies remaining numbers; returns `1` for an empty source. Only callable on `Iter<number>`.                                                                                                  |
| `partition`         | `partition<S extends T>(predicate: (value: T) => value is S): [S[], Exclude<T, S>[]]`<br>`partition(predicate: (value: T) => boolean): [T[], T[]]` | Consumes remaining elements and returns `[matches, nonMatches]`, preserving order in each group.                                                                                                 |
| `collect`           | `collect(): T[]`                                                                                                                                   | Collects and consumes all remaining values into an array.                                                                                                                                        |

`flatMap` and `flatten` flatten one level only; callback results must be synchronous `Iterable` values. `chain` and `zip` accept any `Iterable<U>` without wrapping it in `Iter`. All derived chains share source progress; they do not copy or replay data.
