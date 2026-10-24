---
layout: home
title: Rust 风格的 TypeScript 工具箱
description: 以 Rust 为灵感，为 TypeScript 提供清晰、可组合的工具。
hero:
  name: TSR
  text: Rust 风格的 TypeScript 工具箱
  tagline: 用显式类型、模式匹配与惰性组合，让业务代码表达更清晰。
  image:
    src: /tsr-logo.svg
    alt: TSR 标志
    width: 160
    height: 160
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: TS 与 Rust 对照
      link: /guide/ts-rust-comparison
features:
  - title: 核心类型
    details: '@tsr/core 通过 Option 与 Result 表达可选值、可恢复错误和错误处理流程。'
  - title: 模式匹配
    details: '@tsr/pattern 提供基于 ts-pattern 的稳定入口，用结构化分支处理联合类型。'
  - title: 惰性迭代器
    details: '@tsr/iter 组合惰性数据转换，并由终端操作决定何时消费数据。'
  - title: 类型安全工具
    details: '@tsr/std 提供非空值、数值约束与可重复遍历的整数范围。'
---

> 当前仓库提供 TypeScript 包；Rust 示例仅用于语法与标准库用法对照。
