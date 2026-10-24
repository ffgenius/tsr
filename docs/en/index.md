---
layout: home
title: Rust-inspired TypeScript Toolkit
description: Clear, composable utilities for TypeScript, inspired by Rust.
hero:
  name: TSR
  text: Rust-inspired TypeScript toolkit
  tagline: Make application code clearer with explicit types, pattern matching, and lazy composition.
  image:
    src: /tsr-logo-dark.png
    alt: TSR logo
    width: 160
    height: 160
  actions:
    - theme: brand
      text: Get started
      link: /en/guide/getting-started
    - theme: alt
      text: Compare TypeScript and Rust
      link: /en/guide/ts-rust-comparison
features:
  - title: Core types
    details: '@ffgenius/tsr uses Option and Result to model optional values, recoverable errors, and error handling flows.'
    icon: 🧩
  - title: Pattern matching
    details: '@ffgenius/tsr provides a stable entry point backed by ts-pattern for handling union types with structured branches.'
    icon: 🔀
  - title: Lazy iterators
    details: '@ffgenius/tsr composes lazy data transformations and lets terminal operations decide when to consume values.'
    icon: ♻️
  - title: Type-safe utilities
    details: '@ffgenius/tsr provides non-empty values, numeric constraints, and repeatable integer ranges.'
    icon: 🛡️
---

> The `@ffgenius/tsr` package contains TypeScript implementations only. Rust examples are included for syntax and standard-library comparison.
