# Transports

Transports are the low-level channel implementations that move messages between contexts (tabs, iframes, workers). PubSub MFE provides a flexible adapter layer so you can choose the best transport for your application environment.

## Transport Types

- BroadcastChannel — fastest and simplest for modern browsers.
- SharedWorker — robust, centralized broker for multiple tabs (good for heavy workloads).
- LocalStorage / postMessage — compatibility fallbacks for older browsers.
- Auto — a smart transport that selects the best available option and falls back gracefully.

## Choosing a Transport

- Prefer `BroadcastChannel` when available — low latency, simple API.
- Use `SharedWorker` when you need a centralized broker and more control over message flow and batching.
- Use `Auto` for libraries that need broad compatibility; it selects the best supported transport at runtime.

## Example: Using a Transport Directly

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import {
  createBroadcastChannelTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/broadcast-channel';

const bus = createPubSub();

const transport = createBroadcastChannelTransport({ channelName: 'my-app' });

// Attach transport to an adapter (if using the cross-tab adapter)
// Most apps use the cross-tab adapter rather than managing transports directly
```

## Transport Configuration Options

Typical transport options include:
- `channelName` — unique name for your app channel
- `debug?: boolean;` — enable debugging mode
- `onError?: (error: Error) => void | undefined;` — erorr handling

## Reliability & Deduplication

Transports should implement deduplication and ordering where possible. The adapters in PubSub MFE add an extra deduplication layer to protect against duplicate delivery across transports.

## Security Considerations

- Transports may expose messages to other origins or frames; validate and filter messages at the adapter boundary.
- Use `meta.source` and optional signing at boundaries when communicating with untrusted frames or third-party scripts.

See also: [Cross-Tab Adapter](/guide/adapters/cross-tab) and [Performance Benchmarks](/guide/advanced/performance).
