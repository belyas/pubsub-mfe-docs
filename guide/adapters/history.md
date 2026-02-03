# History Adapter

The History adapter provides **persistent message storage** and **event replay** capabilities using `IndexedDB`, perfect for catching up on missed events or debugging application state.

## Overview

Store messages in the browser's `IndexedDB` and replay them on demand. Ideal for:
- New components catching up on past events
- Debugging application state
- Offline-first applications
- Event sourcing patterns

## Quick Start

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import { createHistoryAdapter } from '@belyas/pubsub-mfe/adapters/history';

const bus = createPubSub({ app: 'my-app' });

// Create and attach history adapter
const history = createHistoryAdapter({
  dbName: 'my-app-history',  // IndexedDB database name
  namespace: 'events',      // Namespace prefix for storage isolation
  maxMessages: 1000,        // Keep last 1000 messages
  ttlSeconds: 86400         // 24 hours retention
});

await history.attach(bus);

// Messages are now automatically stored
bus.publish('cart.item.add', { sku: 'ABC123' });

// Later: Replay history
const pastMessages = await history.getHistory('cart.#');
pastMessages.forEach(msg => console.log(msg));
```

## Configuration

### Basic Options

```typescript
interface HistoryAdapterConfig {
  dbName: string;           // IndexedDB database name
  namespace: string;        // Storage namespace/table
  maxMessages?: number;     // Max messages to keep (default: 1000)
  ttlSeconds?: number;      // Message TTL in seconds (default: 3600)
  gcIntervalMs?: number;    // Garbage collection interval (default: 60000)
  debug?: boolean;          // Enable debug logging
  onError?: (error: Error) => void;  // Error callback
}
```

### Example Configuration

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app-v1',
  namespace: 'events',
  maxMessages: 5000,        // Keep 5000 messages
  ttlSeconds: 172800,       // 2 days retention
  gcIntervalMs: 300000,     // GC every 5 minutes
  debug: true,
  onError: (error) => {
    console.error('History adapter error:', error);
    Sentry.captureException(error);
  }
});
```

## Usage Patterns

### Catch-Up on Component Mount

```typescript
// Component loads and replays missed cart events
async function initCartComponent() {
  const bus = createPubSub({ app: 'shop' });
  const history = createHistoryAdapter({
    dbName: 'shop-history',
    namespace: 'events'
  });
  
  await history.attach(bus);
  
  // Replay cart events from the last hour
  const oneHourAgo = Date.now() - 3600000;
  const cartHistory = await history.getHistory('cart.#', {
    fromTime: oneHourAgo
  });
  
  // Reconstruct cart state
  const cartState = reconstructCartState(cartHistory);
  updateUI(cartState);
  
  // Subscribe to future events
  bus.subscribe('cart.#', (msg) => {
    updateCartState(msg);
  });
}
```

### Event Sourcing

```typescript
// Replay all order events to rebuild state
async function rebuildOrderState(orderId: string) {
  const orderEvents = await history.getHistory(`order.${orderId}.#`);
  
  let orderState = createEmptyOrder(orderId);
  
  for (const event of orderEvents) {
    switch (event.topic) {
      case `order.${orderId}.created`:
        orderState = applyCreatedEvent(orderState, event.payload);
        break;
      case `order.${orderId}.item.added`:
        orderState = applyItemAdded(orderState, event.payload);
        break;
      case `order.${orderId}.status.updated`:
        orderState = applyStatusUpdate(orderState, event.payload);
        break;
    }
  }
  
  return orderState;
}
```

### Debugging Timeline

```typescript
// View all events with time and limit
async function debugEventTimeline(startTime: number, limit: number) {
  const events = await history.getHistory('#', {
    fromTime: startTime,
    limit
  });
  
  console.log(`Found ${events.length} events`);
  events.forEach(event => {
    console.log(`[${new Date(event.timestamp).toISOString()}] ${event.topic}`, event.payload);
  });
}

// Usage
await debugEventTimeline(
  Date.now() - 300000,  // Last 5 minutes
  50
);
```

## API Methods

### `attach(bus)`

Attaches the history adapter to a PubSub bus.

```typescript
await history.attach(bus);
```

### `detach()`

Detaches the adapter and stops recording.

```typescript
await history.detach();
```

### `getHistory(pattern, options?: HistoryQueryOptions)`

Retrieves messages matching a topic pattern.

```typescript
interface HistoryQueryOptions {
  fromTime?: number; // Return messages with timestamp >= fromTime.
  limit?: number; // Maximum number of messages to return.
}

const messages = await history.getHistory('cart.#', {
  fromTime: Date.now() - 3600000,  // Last hour
  limit: 100                     // Max 100 messages
});
```

### `clearHistory()`

Clears stored messages.

```typescript
// Clear all messages for this namespace
await history.clearHistory();
```

### `getStats()`

Returns storage statistics.

```typescript
const stats = await history.getStats();

console.log({
  messagesPersisted: stats.messagesPersisted,
  messagesRetrieved: stats.messagesRetrieved,
  messagesGarbageCollected: stats.messagesGarbageCollected,
  gcCyclesCompleted: stats.gcCyclesCompleted,
  estimatedStorageCount: stats.estimatedStorageCount,
  duplicatesSkipped: stats.duplicatesSkipped,  
  lastGcTimestamp: stats.lastGcTimestamp,
  attached: stats.attached,
  namespace: stats.namespace,
});
```

### `forceGc()`

Manually trigger garbage collection.

```typescript
await history.forceGc();
```

## Garbage Collection

The adapter automatically cleans up old messages based on:

### TTL-Based Cleanup

Messages older than `ttlSeconds` are automatically removed:

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app',
  namespace: 'events',
  ttlSeconds: 86400  // Delete messages older than 24 hours
});
```

### Capacity-Based Cleanup

Oldest messages are removed when `maxMessages` limit is exceeded:

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app',
  namespace: 'events',
  maxMessages: 1000  // Keep only last 1000 messages
});
```

### GC Schedule

Garbage collection runs automatically:

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app',
  namespace: 'events',
  gcIntervalMs: 60000  // Run GC every minute
});
```

## Performance

### Indexing

Messages are indexed by:
- Topic (for pattern matching)
- Timestamp (for time-range queries)
- Namespace (for isolation)

### Query Optimization

```typescript
// ✅ Fast: Specific topic with time range
await history.getHistory('cart.item.add', {
  timeFrom: Date.now() - 3600000,
  limit: 50
});

// ⚠️ Slower: Broad pattern without limits
await history.getHistory('cart.#');

// ❌ Slow: Global pattern
await history.getHistory('#');
```

### Storage Limits

`IndexedDB` has browser-specific limits:
- Chrome: ~80% of available disk space
- Firefox: ~50% of available disk space
- Safari: ~1GB per origin

## Best Practices

### 1. Set Appropriate Retention

```typescript
// Short-lived events (UI state)
const uiHistory = createHistoryAdapter({
  ttlSeconds: 3600,      // 1 hour
  maxMessages: 500
});

// Long-lived events (business data)
const businessHistory = createHistoryAdapter({
  ttlSeconds: 2592000,   // 30 days
  maxMessages: 10000
});
```

### 2. Use Namespaces

```typescript
// Separate history per feature
const cartHistory = createHistoryAdapter({
  dbName: 'my-app',
  namespace: 'cart'
});

const userHistory = createHistoryAdapter({
  dbName: 'my-app',
  namespace: 'user'
});
```

### 3. Limit Query Results

```typescript
// Always use limits for large datasets
const recentEvents = await history.getHistory('cart.#', {
  timeFrom: Date.now() - 86400000,
  limit: 100  // Safety limit
});
```

### 4. Monitor Storage

```typescript
setInterval(async () => {
  const stats = await history.getStats();
  
  if (stats.estimatedStorageCount > 5000) {
    console.warn('History storage getting large');
    await history.forceGc();
  }
}, 300000);  // Check every 5 minutes
```

## Error Handling

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app',
  namespace: 'events',
  onError: (error) => {
    if (error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded');
      // Trigger aggressive cleanup
      history.clearHistory();
    } else {
      console.error('History error:', error);
      Sentry.captureException(error);
    }
  }
});
```

## Browser Support

`IndexedDB` is supported in all modern browsers:
- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 10+)
- Edge: ✅ Full support

## Next Steps

- **[Iframe Adapter](/guide/adapters/iframe)** - Parent-child communication
- **[API Reference](/api/history)** - Complete history API
- **[Examples](/examples/history)** - Real-world patterns

::: warning 🗄️ Storage Considerations
`IndexedDB` is persistent but can be cleared by the browser under storage pressure. For critical data, implement server-side backup.
:::
