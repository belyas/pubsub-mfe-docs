# History Adapter API

Complete API reference for the History adapter with IndexedDB persistence.

## createHistoryAdapter()

Creates a history adapter with IndexedDB-based event storage.

### Signature

```typescript
function createHistoryAdapter(
  config: HistoryAdapterConfig
): HistoryAdapter
```

### Parameters

```typescript
interface HistoryAdapterConfig {
  dbName: string;                   // IndexedDB database name
  namespace?: string;               // Namespace prefix for storage (default: 'default')
  ttlSeconds?: number;              // Time-to-live in seconds (default: 3600 (1 hour))
  maxMessages?: number;             // Maximum number of messages to persist globally (default: 1000)
  gcIntervalMs?: number;            // Garbage collection interval (default: 60000 (1 minute))
  debug?: boolean;                  // Enable debug logging
  onError?: (error: Error) => void; // Error callback
}
```

### Returns

`HistoryAdapter` instance

### Example

```typescript
import { createHistoryAdapter } from '@belyas/pubsub-mfe/adapters/history';

const history = createHistoryAdapter({
  dbName: 'my-app-history',
  namespace: 'events',
  ttlSeconds: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxMessages: 500,
  gcIntervalMs: 60000,
  debug: true
});

await history.attach(bus);
```

---

## HistoryAdapter

### Methods

#### `attach(bus)`

Attaches the adapter to a PubSub bus and starts storing events.

```typescript
async attach(bus: PubSubBus): Promise<void>
```

**Example:**
```typescript
const bus = createPubSub();
await history.attach(bus);

// Events are now being stored
bus.publish('orders.created', { orderId: '123' });
```

#### `detach()`

Detaches the adapter and stops storing events.

```typescript
async detach(): Promise<void>
```

**Example:**
```typescript
await history.detach();
// Storage continues to exist, but no new events stored
```

#### `getHistory(options)`

Retrieves stored events with optional filtering.

```typescript
async getHistory(
  topic: Topic,
  options: HistoryQueryOptions = {}
): Promise<Message<T>[]>

interface HistoryQueryOptions {
  fromTime?: number;     // From timestamp (ms)
  limit?: number;        // Max results
}
```

**Examples:**

```typescript
// Get all events
const allEvents = await history.getHistory('cart.add.item');

// Get events from specific topic
const orderEvents = await history.getHistory('orders.*');

// Get events with time and limit
const recentEvents = await history.getHistory('cart.add.item', {
  startTime: Date.now() - 60000, // Last minute
  limit: 100,
});
```

#### `clearHistory()`

Clears stored events with optional filtering.

```typescript
async clearHistory(): Promise<void>
```

**Examples:**

```typescript
// Clear all events
await history.clearHistory();
```

#### `getStats()`

Returns adapter statistics and storage information.

```typescript
async getStats(): Promise<HistoryAdapterStats>

interface HistoryAdapterStats {
  messagesPersisted: number;
  messagesRetrieved: number;
  messagesGarbageCollected: number;
  duplicatesSkipped: number;
  gcCyclesCompleted: number;
  estimatedStorageCount: number;
  lastGcTimestamp: number | null;
  attached: boolean;
  namespace: string;
}
```

**Example:**

```typescript
const stats = await history.getStats();
console.log(`GC cycles completed: ${stats.gcCyclesCompleted}`);
console.log(`Storage size: ${stats.estimatedStorageCount}`);
console.log(`Persisted messages:, ${stats.messagesPersisted});
```

#### `forceGc()`

Manually triggers garbage collection to remove expired events.

```typescript
async forceGc(): Promise<void>
```

**Example:**

```typescript
await history.forceGc();
```

---

## Advanced Usage

### Event Replay

Replay historical events to rebuild state.

```typescript
const history = createHistoryAdapter({
  dbName: 'app-events',
  ttlSeconds: 30 * 24 * 60 * 60 * 1000 // 30 days
});

await history.attach(bus);

// Later: Replay events to rebuild state
async function rebuildState() {
  const events = await history.getHistory('inventory.*');
  
  for (const event of events) {
    await processEvent(event);
  }
}
```

### Time-Travel Debugging

Debug issues by replaying events from specific time.

```typescript
async function debugIssue(incidentTime: number) {
  // Get events 5 minutes before incident
  const events = await history.getHistory('order.command.updated', {
    startTime: incidentTime - 5 * 60 * 1000,
    limit: 100,
  });
  
  console.log('Events leading to incident:', events);
  
  // Replay in test environment
  for (const event of events) {
    testBus.publish(event.topic, event.payload);
  }
}
```

### Audit Logging

Store all events for audit purposes.

```typescript
const auditHistory = createHistoryAdapter({...});

await auditHistory.attach(bus);

// Later: Generate audit report
async function generateAuditReport(userId: string, startDate: Date, limit: number) {
  const events = await auditHistory.getHistory('cart.item.add', {
    startTime: startDate.getTime(),
    limit,
  });
  
  const userEvents = events.filter(e => 
    e.payload.userId === userId
  );
  
  return createReport(userEvents);
}
```

### Offline Event Storage

Store events while offline, sync when back online.

```typescript
const offlineHistory = createHistoryAdapter({
  dbName: 'offline-queue',
  ttlSeconds: 7 * 24 * 60 * 60 * 1000,
});

await offlineHistory.attach(bus);

// When back online
window.addEventListener('online', async () => {
  const pendingEvents = await offlineHistory.getHistory('cart.item.add', {
    startTime: lastSyncTime,
  });
  
  for (const event of pendingEvents) {
    await syncToServer(event);
  }
  
  // Clear synced events
  await offlineHistory.clearHistory();
});
```

---

## Storage Management

### Capacity Management

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app',
  maxMessages: 1000,  // Keep only last 1000 events
  gcIntervalMs: 30000 // Check every 30s
});

// Monitor capacity
setInterval(async () => {
  const stats = await history.getStats();

  if (stats.messagesPersisted > 900) {
    console.warn('Reaching capacity limit');
  }
}, 60000);
```

### TTL Configuration

```typescript
// Short-term cache
const shortTerm = createHistoryAdapter({
  dbName: 'cache',
  ttlSeconds: 60 * 60 * 1000 // 1 hour
});

// Long-term storage
const longTerm = createHistoryAdapter({
  dbName: 'archive',
  ttlSeconds: 365 * 24 * 60 * 60 * 1000 // 1 year
});
```

## Performance Optimization

### Batch Queries

```typescript
// ❌ Bad: Multiple small queries
for (const topic of topics) {
  await history.getHistory(topic);
}

// ✅ Good: Single query with pattern
const events = await history.getHistory('users.*');
```

### Index Optimization

The adapter creates indexes on:
- `timestamp` - For TTL queries
- `topic` - For topic filtering

```typescript
// ✅ Fast: Uses timestamp index
await history.getHistory('cart.item.add', {
  startTime: start,
  limit: 100
});

// ✅ Fast: Uses topic index
await history.getHistory('orders.*');
```

### Memory Management

```typescript
// Handle large result sets
async function* streamEvents(topic: string) {
  const batchSize = 100;
  let offset = 0;
  
  while (true) {
    const batch = await history.getHistory(topic, {
      limit: batchSize,
    });
    
    if (batch.length === 0) break;
    
    for (const event of batch) {
      yield event;
    }
    
    offset += batchSize;
  }
}
```

## Error Handling

### Common Errors

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app',
  onError: (error) => {
    if (error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded');

      history.clearHistory();
    } else if (error.name === 'InvalidStateError') {
      console.error('IndexedDB not available');
      // Fallback to memory storage
    } else {
      console.error('History adapter error:', error);
    }
  }
});
```

### Database Errors

- `QuotaExceededError` - Storage quota exceeded
- `InvalidStateError` - IndexedDB not available
- `VersionError` - Database version mismatch
- `AbortError` - Transaction aborted

---

## Type Definitions

```typescript
interface HistoryAdapter {
  async attach(bus: PubSubBus): Promise<void>;
  async detach(): Promise<void>;
  async getHistory<T = unknown>(
    topic: Topic,
    options: HistoryQueryOptions = {}
  ): Promise<Message<T>[]>;
  async clearHistory(): Promise<void>;
  async getStats(): Promise<HistoryAdapterStats>;
  async forceGc(): Promise<void>;
}

interface HistoryQueryOptions {
  fromTime?: number;
  limit?: number;
}

interface HistoryAdapterStats {
  messagesPersisted: number;
  messagesRetrieved: number;
  messagesGarbageCollected: number;
  duplicatesSkipped: number;
  gcCyclesCompleted: number;
  estimatedStorageCount: number;
  lastGcTimestamp: number | null;
  attached: boolean;
  namespace: string;
}
```

---

## Browser Support

The History adapter requires IndexedDB support:

- ✅ Chrome 24+
- ✅ Firefox 16+
- ✅ Safari 10+
- ✅ Edge 12+
- ❌ IE (use polyfill)

**Feature Detection:**

```typescript
if (!window.indexedDB) {
  console.warn('IndexedDB not supported');
  // Use alternative storage
}
```

---

## Next Steps

- **[History Guide](/guide/adapters/history)** - Usage guide
- **[Cross-Tab API](/api/cross-tab)** - Cross-tab adapter
- **[Types](/api/types)** - Complete type definitions
- **[Core API](/api/core)** - Core PubSub API
