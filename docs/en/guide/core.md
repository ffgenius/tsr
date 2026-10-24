# Option and Result

`@ffgenius/tsr` exports `Option`, `Result`, the convenience constructors `Some`, `None`, `Ok`, and `Err`, plus their unwrap error classes. These names are the package's source types: import the classes as values or use `import type` when only a type is needed.

## Option

`Option<T>` represents a present value with `Some` and a missing value with `None`. Its public readonly discriminant is `kind`; its constructor and stored value are private. `Option.some(undefined)` is still `Some`, while `Option.fromNullable` converts only `null` and `undefined` to `None`.

### Composition and conversion

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

### Extraction and branching

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

`Result<T, E>` represents success with `Ok` and failure with `Err`. Its public readonly discriminant is `kind`; use methods to read the value or error. `andThen` combines error types, while `orElse` combines the original and recovery success types.

### Composition and conversion

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

### Extraction and branching

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

`Result` is synchronous. For asynchronous work, use `Promise<Result<T, E>>`; Promise rejections are not captured automatically.

Both classes extend the native `Error`. `OptionUnwrapError` carries no value; `ResultUnwrapError` stores the original value as `cause`.

Rust's `Option` and `Result` are enums; use `match` to inspect their variants, and `?` to propagate compatible errors. TSR's wrapper objects provide similar composition methods, but do not automatically capture exceptions or Promise rejections.

## API Reference

### Option

| API                   | TypeScript type                                                                                                                | Description                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Option.some`         | `static some<T>(value: T): Option<T>`                                                                                          | Creates `Some`; values including `undefined` are preserved.                         |
| `Option.none`         | `static none<T = never>(): Option<T>`                                                                                          | Creates `None`; the implementation reuses a shared empty instance.                  |
| `Option.fromNullable` | `static fromNullable<T>(value: T \| null \| undefined): Option<NonNullable<T>>`                                                | Returns `None` for `null` / `undefined` and `Some` otherwise.                       |
| `Some`                | `Some<T>(value: T): Option<T>`                                                                                                 | Convenience function for `Option.some`.                                             |
| `None`                | `Option<never>`                                                                                                                | Shared `None` constant assignable to any `Option<T>`.                               |
| `kind`                | `readonly kind: 'some' \| 'none'`                                                                                              | Public discriminant.                                                                |
| `map`                 | `map<U>(fn: (value: T) => U): Option<U>`                                                                                       | Transforms `Some`; leaves `None` empty.                                             |
| `andThen`             | `andThen<U>(fn: (value: T) => Option<U>): Option<U>`                                                                           | Chains a callback returning another `Option`.                                       |
| `filter`              | `filter<S extends T>(predicate: (value: T) => value is S): Option<S>`<br>`filter(predicate: (value: T) => boolean): Option<T>` | Returns `None` when the predicate fails; the type-guard overload narrows the value. |
| `flatten`             | `flatten<U>(this: Option<Option<U>>): Option<U>`                                                                               | Removes one nested `Option` layer.                                                  |
| `zip`                 | `zip<U>(other: Option<U>): Option<[T, U]>`                                                                                     | Returns a tuple when both sides are present, otherwise `None`.                      |
| `unwrap`              | `unwrap(): T`                                                                                                                  | Returns the `Some` value; throws `OptionUnwrapError` for `None`.                    |
| `expect`              | `expect(message: string): T`                                                                                                   | Like `unwrap`, with a caller-provided error message.                                |
| `unwrapOr`            | `unwrapOr(defaultValue: T): T`                                                                                                 | Returns the supplied default when empty.                                            |
| `unwrapOrElse`        | `unwrapOrElse(defaultValue: () => T): T`                                                                                       | Calls the default callback only when empty.                                         |
| `okOr`                | `okOr<E>(error: E): Result<T, E>`                                                                                              | Converts `Some` to `Ok` and `None` to `Err(error)`.                                 |
| `isSome`              | `isSome(): this is Option<T> & { readonly kind: 'some' }`                                                                      | Type guard that narrows `kind` to `'some'`.                                         |
| `isNone`              | `isNone(): this is Option<T> & { readonly kind: 'none' }`                                                                      | Type guard that narrows `kind` to `'none'`.                                         |
| `match`               | `match<U>(cases: { some: (value: T) => U; none: () => U }): U`                                                                 | Calls the matching branch and infers a shared return type.                          |

### Result

| API            | TypeScript type                                                     | Description                                                   |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Result.ok`    | `static ok<T, E = never>(value: T): Result<T, E>`                   | Creates a successful result.                                  |
| `Result.err`   | `static err<E, T = never>(error: E): Result<T, E>`                  | Creates a failed result.                                      |
| `Ok`           | `Ok<T, E = never>(value: T): Result<T, E>`                          | Convenience function for `Result.ok`.                         |
| `Err`          | `Err<E, T = never>(error: E): Result<T, E>`                         | Convenience function for `Result.err`.                        |
| `kind`         | `readonly kind: 'ok' \| 'err'`                                      | Public discriminant.                                          |
| `map`          | `map<U>(fn: (value: T) => U): Result<U, E>`                         | Transforms only `Ok`; preserves an `Err`.                     |
| `mapErr`       | `mapErr<F>(fn: (error: E) => F): Result<T, F>`                      | Transforms only `Err`; preserves an `Ok`.                     |
| `andThen`      | `andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, E \| F>`  | Chains a fallible operation and combines error types.         |
| `orElse`       | `orElse<U, F>(fn: (error: E) => Result<U, F>): Result<T \| U, F>`   | Recovers from failure; the success type may become `T \| U`.  |
| `unwrap`       | `unwrap(): T`                                                       | Returns the `Ok` value; throws `ResultUnwrapError` for `Err`. |
| `expect`       | `expect(message: string): T`                                        | Like `unwrap`, with a caller-provided error message.          |
| `unwrapOr`     | `unwrapOr(defaultValue: T): T`                                      | Returns the supplied default for `Err`.                       |
| `unwrapOrElse` | `unwrapOrElse(defaultValue: (error: E) => T): T`                    | Computes a default from the error for `Err`.                  |
| `unwrapErr`    | `unwrapErr(): E`                                                    | Returns the error; throws `ResultUnwrapError` for `Ok`.       |
| `isOk`         | `isOk(): this is Result<T, E> & { readonly kind: 'ok' }`            | Type guard that narrows `kind` to `'ok'`.                     |
| `isErr`        | `isErr(): this is Result<T, E> & { readonly kind: 'err' }`          | Type guard that narrows `kind` to `'err'`.                    |
| `ok`           | `ok(): Option<T>`                                                   | Converts success to `Some` and failure to `None`.             |
| `err`          | `err(): Option<E>`                                                  | Converts failure to `Some` and success to `None`.             |
| `match`        | `match<U>(cases: { ok: (value: T) => U; err: (error: E) => U }): U` | Calls the success or failure callback.                        |
| `transpose`    | `transpose<U>(this: Result<Option<U>, E>): Option<Result<U, E>>`    | Transposes a nested `Result<Option<U>, E>`.                   |
| `flatten`      | `flatten<U, F>(this: Result<Result<U, F>, E>): Result<U, E \| F>`   | Removes a nested `Result` layer and combines errors.          |

### Error types

| API                       | TypeScript type                                          | Description                                                                                                             |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `OptionUnwrapError`       | `new OptionUnwrapError(message: string)`                 | Thrown when `Option.unwrap()` or `expect()` is called on `None`.                                                        |
| `ResultUnwrapError`       | `new ResultUnwrapError(message: string, error: unknown)` | Thrown when unwrapping the wrong `Result` branch; the original value is available through `error` and standard `cause`. |
| `ResultUnwrapError.error` | `readonly error: unknown`                                | The original error or success value that caused the unwrap failure.                                                     |
