# Getting Started

## Install

```sh
npm install @ffgenius/tsr
```

## Use

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

`Option` and `Result` represent optional and recoverable values. `Iter` provides lazy iteration, while `match` handles values by pattern. See the module guides for individual APIs.
