# TSR

Rust-inspired utility toolkit for TypeScript. The `@ffgenius/tsr` package exports `Option`, `Result`, pattern matching, lazy iterators, and type-safe standard utilities. It does not contain a Rust implementation.

TSR 是一个受 Rust 启发的 TypeScript 工具包，`@ffgenius/tsr` 导出 `Option`、`Result`、模式匹配、惰性迭代器和类型安全工具。仓库暂不包含 Rust 实现。

## Install

```sh
npm install @ffgenius/tsr
```

```ts
import { Iter, Option, Result, match, range } from '@ffgenius/tsr'
```

## Documentation

The documentation is bilingual and includes switchable TypeScript/Rust examples.

```sh
pnpm install
pnpm run docs:dev
```

Use `pnpm run docs:build` to build the site and `pnpm run docs:preview` to preview the production build.

## Development

```sh
pnpm test
pnpm build
```

## License

[MIT](./LICENSE)
