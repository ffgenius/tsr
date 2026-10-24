# Getting Started

## Requirements

- Node.js `22.18.0` or later
- pnpm `10.34.1`

## Run Locally

Install dependencies and start the documentation site from the repository root:

```sh
pnpm install
pnpm run docs:dev
```

Build and preview the production site:

```sh
pnpm run docs:build
pnpm run docs:preview
```

Run package tests and builds:

```sh
pnpm test
pnpm build
```

## Packages

| Package         | Entry point     | Contents                                                                                            |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `@ffgenius/tsr` | `@ffgenius/tsr` | `Option`, `Result`, pattern matching, lazy iterators, non-empty values, numeric constraints, ranges |

Install the package and import the APIs you need from its single entry point:

```sh
npm install @ffgenius/tsr
```

```ts
import { Iter, Option, Result, match, range } from '@ffgenius/tsr'
```

Module guides pair the TypeScript APIs with common Rust idioms. The examples describe conceptual correspondences; their APIs and type rules are not identical.
