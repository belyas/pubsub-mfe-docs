# Installation

## Package Manager

Install PubSub MFE using your preferred package manager:

::: code-group
```bash [npm]
npm install @belyas/pubsub-mfe
```

```bash [pnpm]
pnpm add @belyas/pubsub-mfe
```

```bash [yarn]
yarn add @belyas/pubsub-mfe
```

```bash [bun]
bun add @belyas/pubsub-mfe
```
:::

## CDN

For quick prototyping or non-build environments:

```html
<!-- ES Module -->
<script type="module">
  import { createPubSub } from 'https://cdn.jsdelivr.net/npm/@belyas/pubsub-mfe@0.7.0/dist/index.min.js';
  
  const bus = createPubSub({ app: 'my-app' });

  bus.subscribe('#', (msg) => console.log(msg));
</script>
```

::: warning ⚠️ Production Warning
CDN imports are not recommended for production. Use a proper build tool for optimal performance and tree-shaking.
:::

## TypeScript

PubSub MFE is written in TypeScript and includes full type definitions out of the box.

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

## Module Imports

### Core Library

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
```

### Adapters

PubSub MFE supports **tree-shakable** adapter imports:

```typescript
// Cross-tab adapter
import { createCrossTabAdapter } from '@belyas/pubsub-mfe/adapters/cross-tab';

// History adapter
import { createHistoryAdapter } from '@belyas/pubsub-mfe/adapters/history';

// Iframe adapter
import { createIframeHost, createIframeClient } from '@belyas/pubsub-mfe/adapters/iframe';
```

### Individual Transports

For maximum tree-shaking, import transports individually:

```typescript
// BroadcastChannel transport
import { createBroadcastChannelTransport } from '@belyas/pubsub-mfe/adapters/cross-tab/transports/broadcast-channel';

// SharedWorker transport
import { createSharedWorkerTransport } from '@belyas/pubsub-mfe/adapters/cross-tab/transports/shared-worker';

// Storage transport (localStorage)
import { createStorageTransport } from '@belyas/pubsub-mfe/adapters/cross-tab/transports/storage';

// Auto-select transport (smart fallback)
import { createAutoTransport } from '@belyas/pubsub-mfe/adapters/cross-tab/transports/auto';
```

## Bundle Sizes

PubSub MFE is designed to be lightweight with excellent tree-shaking:

| Import | Minified | Gzipped |
|--------|----------|---------|
| Core only | ~17KB | ~5KB |
| + Cross-tab (Main implementation) | ~31KB | ~8KB |
| + Cross-tab (BroadcastChannel) | ~3KB | ~1KB |
| + Cross-tab (SharedWorker) | ~6KB | ~2KB |
| + Broadcast transport | ~3KB | ~1KB |
| + SharedWorker transport | ~6KB | ~2KB |
| + Storage transport | ~6KB | ~2KB |
| + History adapter | ~10KB | ~3KB |
| + Iframe adapter | ~14KB | ~4KB |
| Full bundle | ~35KB | ~12KB |

::: tip 💡 Tree-Shaking
Only the code you import is included in your bundle. Unused adapters and features are automatically removed.
:::

## Build Tool Configuration

### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['@belyas/pubsub-mfe']
  }
});
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  optimization: {
    usedExports: true, // Enable tree-shaking
    sideEffects: false
  }
};
```

### Rollup

```javascript
// rollup.config.js
export default {
  output: {
    format: 'esm'
  },
  treeshake: {
    moduleSideEffects: false
  }
};
```

## Verification

After installation, verify everything works:

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'test' });

bus.subscribe('test.topic', (msg) => {
  console.log('✅ PubSub MFE is working!', msg);
});

bus.publish('test.topic', { status: 'ok' });
```

Expected output:
```
✅ PubSub MFE is working! {
  id: '6952f94b-d51b-43a6-8384-32570f5f220a',
  topic: 'test.topic',
  payload: { status: 'ok' },
  ts: 1704067200000,
  schemaVersion: null,
  meta: {
    source: 'test',
    correlationId: null,
  }
}
```

## Next Steps

- **[Getting Started](/guide/getting-started)** - Your first PubSub app
- **[Core Concepts](/guide/core-concepts)** - Understanding the architecture
- **[API Reference](/api/core)** - Complete API documentation

## Troubleshooting

### Module Not Found

If you see `Cannot find module '@belyas/pubsub-mfe'`:

1. Verify installation: `npm ls @belyas/pubsub-mfe`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check package.json has the correct dependency

### Type Errors

If TypeScript can't find types:

1. Ensure `"moduleResolution": "bundler"` or `"node16"` in tsconfig.json
2. Restart your TypeScript server
3. Check that `node_modules/@belyas/pubsub-mfe/dist/index.d.ts` exists

### Build Errors

If your bundler fails to build:

1. Ensure you're using a modern bundler version
2. Check that `"type": "module"` is in your package.json (for ESM)
3. Enable tree-shaking in your bundler config

::: tip 💬 Need Help?
- Report issues: [GitHub Issues](https://github.com/belyas/pubsub-mfe/issues)
- Discussions: [GitHub Discussions](https://github.com/belyas/pubsub-mfe/discussions)
:::
