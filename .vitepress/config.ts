import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PubSub MFE',
  description: 'Browser-native Pub/Sub for microfrontends — zero dependencies, MQTT-style wildcards, optional schema validation',
  base: '/',

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/core' },
      { text: 'Examples', link: '/examples/basic' },
      { 
        text: 'v0.7.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/belyas/pubsub-mfe/blob/main/CHANGELOG.md' },
          { text: 'Contributing', link: 'https://github.com/belyas/pubsub-mfe/blob/main/CONTRIBUTING.md' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
            { text: 'Installation', link: '/guide/installation' }
          ]
        },
        {
          text: 'Core Features',
          items: [
            { text: 'Publishing & Subscribing', link: '/guide/pub-sub' },
            { text: 'Topic Patterns', link: '/guide/topic-patterns' },
            { text: 'Handler Isolation', link: '/guide/handler-isolation' },
            { text: 'Schema Validation', link: '/guide/schema-validation' },
            { text: 'Source Filtering', link: '/guide/source-filtering' }
          ]
        },
        {
          text: 'Adapters',
          items: [
            { text: 'Cross-Tab Communication', link: '/guide/adapters/cross-tab' },
            { text: 'History & Replay', link: '/guide/adapters/history' },
            { text: 'Iframe Communication', link: '/guide/adapters/iframe' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Transports', link: '/guide/advanced/transports' },
            { text: 'Performance', link: '/guide/advanced/performance' },
            { text: 'Best Practices', link: '/guide/advanced/best-practices' },
            { text: 'Troubleshooting', link: '/guide/advanced/troubleshooting' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Core API', link: '/api/core' },
            { text: 'Cross-Tab Adapter', link: '/api/cross-tab' },
            { text: 'History Adapter', link: '/api/history' },
            { text: 'Iframe Adapter', link: '/api/iframe' },
            { text: 'Types', link: '/api/types' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Usage', link: '/examples/basic' },
            { text: 'Cross-Tab Sync', link: '/examples/cross-tab' },
            { text: 'History Replay', link: '/examples/history' },
            { text: 'Iframe Bridge', link: '/examples/iframe' },
            { text: 'Schema Validation', link: '/examples/schema' },
            { text: 'Real-World Patterns', link: '/examples/patterns' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/belyas/pubsub-mfe' }
    ],

    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © 2026-present Yassine Belkaid'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/belyas/pubsub-mfe-docs/edit/main/:path',
      text: 'Edit this page on GitHub'
    }
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'PubSub MFE' }]
  ]
})
