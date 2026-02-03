# Cross-Tab Adapter API

Complete API reference for the Cross-Tab adapter and its transports.

## createCrossTabAdapter()

Creates a cross-tab synchronization adapter.

### Signature

```typescript
function createCrossTabAdapter(
  config: CrossTabAdapterConfig
): CrossTabAdapter
```

### Parameters

```typescript
interface CrossTabAdapterConfig {
  channelName: string;              // Unique channel identifier
  transport: Transport;             // Custom transport instance
  clientId?: string;                // Client ID for this tab
  enableLeadership?: boolean;       // Enable leadership detection
  emitSystemEvents?: boolean;       // Emit system events
  maxMessageSize?: number;          // Maximum message size in bytes

  /** Rate Limiting Configs */
  rateLimit?: {
    maxPerSecond: number; // Maximum messages per second from other tabs
    maxBurst: number;     // Maximum burst size (token bucket capacity)
  };

  expectedOrigin?: string;          // Expected origin for messages
  
  /** Deduplication Configs */
  dedupeWindowMs?: number;          // Time window for deduplication in milliseconds
  dedupeCacheSize?: number;         // Maximum size of the deduplication cache (LRU)

  /** Batching Configs */
  batchIntervalMs?: number;         // Batch outgoing messages for this duration (milliseconds)
  maxBatchSize?: number;            // Maximum number of messages in a single batch

  debug?: boolean;                  // Enable debug logging
  onError?: (error: Error) => void; // Error handler for adapter errors
}
```

### Returns

`CrossTabAdapter` instance

### Example

```typescript
import {
  createCrossTabAdapter
} from '@belyas/pubsub-mfe/adapters/cross-tab';

const crossTab = createCrossTabAdapter({
  channelName: 'my-app-v1',
  maxBatchSize: 50,
  batchIntervalMs: 100,
  dedupeCacheSize: 1000,
  dedupeWindowMs: 60000,
  debug: true
});

crossTab.attach(bus);
```

## CrossTabAdapter

### Methods

#### `attach(bus)`

Attach the adapter to a PubSubBus instance.

```typescript
attach(bus: PubSubBus): void
```

#### `detach()`

Detaches the adapter and closes transport.
Cleans up all hooks, listeners, and resources.

```typescript
detach(): void
```

#### `reconnect()`

Reconnect the adapter to the bus.

```typescript
reconnect(): void
```

#### `getStats()`

Returns adapter statistics.

```typescript
getStats(): CrossTabStats

interface CrossTabStats {
  messagesSent: number;
  messagesReceived: number;
  messagesDeduplicated: number;
  messagesRejected: number;
  messagesRateLimited: number;
  messagesOversized: number;
  originBlocked: number;
  batchesSent: number;
  averageBatchSize: number;
  maxBatchSizeSeen: number;
  dedupeCacheSize: number;
  isLeader: boolean;
  clientId: ClientId;
}
```

---

## Transport APIs

### BroadcastChannel Transport

#### `createBroadcastChannelTransport()`

```typescript
function createBroadcastChannelTransport(
  config: BroadcastChannelTransportConfig
): BroadcastChannelTransport

interface BroadcastChannelTransportConfig {
  channelName: string;
  debug?: boolean;
  onError?: (error: Error) => void | undefined;
}
```

**Example:**

```typescript
import {
  createBroadcastChannelTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/broadcast-channel';

const transport = createBroadcastChannelTransport({
  channelName: 'my-app'
});

const crossTab = createCrossTabAdapter({
  channelName: 'my-app',
  transport
});
```

### SharedWorker Transport

#### `createSharedWorkerTransport()`

```typescript
function createSharedWorkerTransport(
  config: SharedWorkerTransportConfig
): SharedWorkerTransport

interface SharedWorkerTransportConfig {
  channelName: string;
  workerUrl: string;
  clientId?: string;
  reconnectAttempts?: number;
  reconnectDelayMs?: number;
  debug?: boolean;
  onError?: (error: Error) => void | undefined;
  onFallback?: (reason: string) => void;
}
```

**Example:**

```typescript
import {
  createSharedWorkerTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/shared-worker';

const transport = createSharedWorkerTransport({
  channelName: 'my-app',
  workerUrl: new URL(
    './node_modules/@belyas/pubsub-mfe/dist/workers/cross-tab-shared-worker-broker.js',
    import.meta.url
  ).href,
  reconnectAttempts: 5,
  reconnectDelayMs: 2000
});
```

### Storage Transport

#### `createStorageTransport()`

```typescript
function createStorageTransport(
  config: StorageTransportConfig
): StorageTransport

interface StorageTransportConfig {
  channelName: string;
  clientId?: string;
  storage?: Storage;
  ttlMs?: number;
  cleanupIntervalMs?: number;
  maxMessages?: number;
  keyPrefix?: string;
  debug?: boolean;
  onError?: (error: Error) => void;
}
```

**Example:**

```typescript
import {
  createStorageTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/storage';

const transport = createStorageTransport({
  channelName: 'my-app',
  ttlMs: 120,
  maxMessages: 200,
  cleanupIntervalMs: 5000
});
```

### Auto Transport

#### `createAutoTransport()`

Smart transport selector with automatic fallback.

```typescript
function createAutoTransport(
  config: AutoTransportOptions
): AutoTransportResult

interface AutoTransportOptions {
  channelName: string;
  clientId?: string;
  preferredMode?: TransportType;
  onFallback?: (from: TransportType, to: TransportType, reason: string) => void;
  sharedWorkerUrl?: string;
  storageTtlMs?: number;
  storageMaxMessages?: number;
  debug?: boolean;
  onError?: (error: Error) => void;
}

type TransportType = "sharedworker" | "broadcast-channel" | "storage";
```

**Example:**

```typescript
import {
  createAutoTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/auto';

const transport = createAutoTransport({
  channelName: 'my-app',
  preferredMode: 'sharedworker',
  sharedWorkerUrl: '/workers/broker.js',
  onFallback: (from, to, reason) => {
    console.warn(`Transport fallback: ${from} → ${to}`);
    analytics.track('transport_fallback', { from, to, reason });
  }
});
```

**Fallback Order:**
1. SharedWorker (if `sharedWorkerUrl` provided)
2. BroadcastChannel
3. Storage (localStorage)

## Transport Interface

All transports implement the `Transport` interface:

```typescript
interface Transport {
  readonly name: string;

  send(envelope: CrossTabEnvelope): void;
  onMessage(handler: (envelope: CrossTabEnvelope) => void): () => void;
  close(): void;
  isAvailable(): boolean;
}
```

### Envelope Format

```typescript
interface Envelope {
  topic: string;
  payload: T;
  messageId: string;
  clientId: ClientId;
  source?: string;
  schemaVersion?: string;
  timestamp: number;
  origin: string;
  sequence?: SequenceNumber;
  version: number;
  meta?: Record<string, unknown>;
}
```

## Performance Metrics

### Transport Comparison

| Transport | Latency | Throughput | Memory | Browser Support | Recommended For |
|-----------|---------|------------|--------|-----------------|-----------------|
| **BroadcastChannel** | 1-5ms | 10,000+ msg/s | Low | Modern browsers | High-frequency, low-latency |
| **SharedWorker** | 5-10ms | 5,000+ msg/s | Medium | Good | Reliable, persistent connections |
| **Storage** | 50-100ms | 100-500 msg/s | Low | Universal | Fallback, compatibility |

### Best Practices

```typescript
// ✅ Good: Use Auto for best compatibility
const transport = createAutoTransport({
  channelName: 'my-app'
});

// ✅ Good: Optimize for performance
const crossTab = createCrossTabAdapter({
  channelName: 'my-app',
  maxBatchSize: 100,
  batchIntervalMs: 10,
  dedupeCacheSize: 500,
  dedupeWindowMs: 30000,
  transport,
});

// ⚠️ Use specific transport only when needed
const transport = createBroadcastChannelTransport({
  channelName: 'my-app'
});
```

---

## Error Handling

### Common Errors

```typescript
const crossTab = createCrossTabAdapter({
  channelName: 'my-app',
  onError: (error: Error) => {
    console.error('Cross-tab error:', error);
    // Send to error tracking
    Sentry.captureException(error);
  }
});
```

### Transport-Specific Errors

**BroadcastChannel:**
- `BroadcastChannel not supported`
- `Channel closed unexpectedly`

**SharedWorker:**
- `SharedWorker not available`
- `Worker script failed to load`
- `Handshake timeout`

**Storage:**
- `QuotaExceededError` - Storage full
- `StorageEvent not supported`

---

## Type Definitions

```typescript
type TransportCls = BroadcastChannelTransport | SharedWorkerTransport | StorageTransport;

type TransportType = "storage" | "sharedworker" | "broadcast-channel";

interface TransportConfig {
  debug?: boolean;
  onError?: (error: Error) => void;
}

interface CrossTabAdapter {
  attach(bus: PubSubBus): void;
  detach(): void;
  reconnect(): void;
  getStats(): CrossTabStats;
}
```

---

## Next Steps

- **[History Adapter API](/api/history)** - History storage API
- **[Iframe Adapter API](/api/iframe)** - Iframe communication API
- **[Types](/api/types)** - Complete type definitions
- **[Cross-Tab Guide](/guide/adapters/cross-tab)** - Usage guide

::: tip 💡 Tree-Shaking
Import only the transport you need for optimal bundle size:
```typescript
import {
  createBroadcastChannelTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/broadcast-channel';
```
:::
