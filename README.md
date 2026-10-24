# TSR

Rust-inspired utility packages for TypeScript. The repository currently contains TypeScript implementations of `Option`, `Result`, pattern matching, lazy iterators, and type-safe standard utilities. It does not contain a Rust implementation.

TSR 是一组受 Rust 启发的 TypeScript 工具包，目前包含 `Option`、`Result`、模式匹配、惰性迭代器和类型安全工具。仓库暂不包含 Rust 实现。

## Packages

- `@tsr/core`: `Option` and `Result`
- `@tsr/pattern`: pattern matching backed by `ts-pattern`
- `@tsr/iter`: lazy synchronous iterators
- `@tsr/std`: non-empty values, numeric constraints, and ranges

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
