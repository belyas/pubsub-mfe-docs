# PubSub MFE Documentation

This is the documentation website for [@belyas/pubsub-mfe](https://github.com/belyas/pubsub-mfe), built with [VitePress](https://vitepress.dev/).

## 🚀 Quick Start

### Install Dependencies

```bash
pnpm install
```

### Development Server

```bash
pnpm dev
```

The site will be available at `http://localhost:5173`

### Build

```bash
pnpm build
```

Output will be in `.vitepress/dist`

### Preview Build

```bash
pnpm preview
```

## 🎨 Theme

This site uses VitePress's default theme with minimal customization for clean, professional documentation.

## 📝 Writing Documentation

### Adding a New Page

1. Create a Markdown file in the appropriate directory
2. Add frontmatter if needed:

```markdown
---
title: Page Title
description: Page description for SEO
---

# Page Title

Content here...
```

3. Update `.vitepress/config.ts` sidebar configuration

### Using Components

VitePress supports Vue components:

```markdown
<script setup>
import CustomComponent from './components/CustomComponent.vue'
</script>

<CustomComponent />
```

### Code Blocks

Use syntax highlighting:

````markdown
```typescript
const bus = createPubSub({ app: 'my-app' });
```
````

### Custom Containers

```markdown
::: tip
This is a tip
:::

::: warning
This is a warning
:::

::: danger
This is a dangerous warning
:::

::: info
This is an info box
:::
```

## 🔍 Search

VitePress includes built-in local search. No configuration needed!

## 🌐 Base URL

The site is configured for GitHub Pages deployment at `/`. Update `base` in `.vitepress/config.ts` if deploying elsewhere:

```typescript
export default defineConfig({
  base: '/your-repo-name/', // Change this
  // ...
})
```

## 📦 Dependencies

- **vitepress**: ^1.5.0 - Static site generator
- **vue**: ^3.5.13 - Required by VitePress
- **gh-pages**: ^6.2.0 - GitHub Pages deployment utility

## 🤝 Contributing

To contribute to the documentation:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `pnpm dev`
5. Submit a pull request

## 📄 License

Apache-2.0 License - See LICENSE file for details
