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

| Package        | Entry point    | Contents                                          |
| -------------- | -------------- | ------------------------------------------------- |
| `@tsr/core`    | `@tsr/core`    | `Option`, `Result`                                |
| `@tsr/pattern` | `@tsr/pattern` | `match`, `caseOf`, `otherwise`, `matchChain`, `P` |
| `@tsr/iter`    | `@tsr/iter`    | Lazy synchronous iterators                        |
| `@tsr/std`     | `@tsr/std`     | Non-empty values, numeric constraints, ranges     |

Module guides pair the TypeScript package APIs with common Rust idioms. The examples describe conceptual correspondences; their APIs and type rules are not identical.
