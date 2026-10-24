# TSR

Rust-inspired utility toolkit for TypeScript. The `@ffgenius/tsr` package exports `Option`, `Result`, pattern matching, lazy iterators, and type-safe standard utilities. It does not contain a Rust implementation.

## Usage

```sh
npm install @ffgenius/tsr
```

```ts
import {
  Iter,
  Ok,
  Option,
  caseOf,
  match,
  otherwise,
  range,
} from '@ffgenius/tsr'

const name = Option.fromNullable<string>(null).unwrapOr('Guest')
const total = Iter.from(range.closed(1, 3))
  .map((value) => value * 2)
  .sum()
const doubled = Ok(total)
  .map((value) => value * 2)
  .unwrapOr(0)

const message = match(
  { type: 'success', value: doubled } as const,
  caseOf({ type: 'success' }, ({ value }) => `Total: ${value}`),
  otherwise(() => 'No result')
)
```

## License

[MIT](./LICENSE)
