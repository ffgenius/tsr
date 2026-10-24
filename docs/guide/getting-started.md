# 快速开始

## 环境要求

- Node.js `22.18.0` 或更高版本
- pnpm `10.34.1`

## 本地运行

在仓库根目录安装依赖并启动文档站点：

```sh
pnpm install
pnpm run docs:dev
```

构建和预览生产站点：

```sh
pnpm run docs:build
pnpm run docs:preview
```

运行包测试和构建：

```sh
pnpm test
pnpm build
```

## 包概览

| 包              | 入口            | 主要内容                                                         |
| --------------- | --------------- | ---------------------------------------------------------------- |
| `@ffgenius/tsr` | `@ffgenius/tsr` | `Option`、`Result`、模式匹配、惰性迭代器、非空值、数值约束、范围 |

安装后可以从统一入口按需导入：

```sh
npm install @ffgenius/tsr
```

```ts
import { Iter, Option, Result, match, range } from '@ffgenius/tsr'
```

各模块的 TypeScript 用法和对应 Rust 惯用写法见模块指南。Rust 示例展示概念上的对应关系；TSR 仓库本身没有 Rust 实现，两个生态的 API 和类型规则并不完全相同。
