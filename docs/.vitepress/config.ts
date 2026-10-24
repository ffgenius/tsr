import { defineConfig } from 'vitepress'

const zhSidebar = [
  {
    text: '开始',
    items: [
      { text: '快速开始', link: '/guide/getting-started' },
      { text: 'TS 与 Rust 对照', link: '/guide/ts-rust-comparison' },
    ],
  },
  {
    text: '模块',
    items: [
      { text: 'Option 与 Result', link: '/guide/core' },
      { text: '模式匹配', link: '/guide/pattern' },
      { text: '惰性迭代器', link: '/guide/iter' },
      { text: '类型安全工具', link: '/guide/std' },
    ],
  },
  { text: '设计文档', link: '/design' },
]

const enSidebar = [
  {
    text: 'Start',
    items: [
      { text: 'Getting Started', link: '/en/guide/getting-started' },
      { text: 'TypeScript and Rust', link: '/en/guide/ts-rust-comparison' },
    ],
  },
  {
    text: 'Packages',
    items: [
      { text: 'Option and Result', link: '/en/guide/core' },
      { text: 'Pattern Matching', link: '/en/guide/pattern' },
      { text: 'Lazy Iterators', link: '/en/guide/iter' },
      { text: 'Type-safe Utilities', link: '/en/guide/std' },
    ],
  },
]

export default defineConfig({
  title: 'TSR',
  description: 'Rust-inspired utility packages for TypeScript',
  cleanUrls: true,
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/getting-started' },
          { text: 'TS 与 Rust 对照', link: '/guide/ts-rust-comparison' },
        ],
        sidebar: zhSidebar,
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'TypeScript and Rust', link: '/en/guide/ts-rust-comparison' },
        ],
        sidebar: enSidebar,
      },
    },
  },
  themeConfig: {
    logo: '/tsr-logo.svg',
    search: { provider: 'local' },
  },
})
