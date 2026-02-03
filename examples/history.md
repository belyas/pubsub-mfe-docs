# History Replay

The History adapter stores messages in `IndexedDB` so new clients can catch up on recent events or the system can replay past messages for recovery. Storage is shared across all tabs/windows of the same origin.

## When to use

- New tabs or microfrontends need to sync initial state.
- Replaying events to rebuild a view after a reload.
- Auditing or debugging message flows.
- Event sourcing patterns.

## Example: Attach history adapter and replay

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import { createHistoryAdapter } from '@belyas/pubsub-mfe/adapters/history';

const bus = createPubSub({ app: 'my-app' });

const history = createHistoryAdapter({
  dbName: 'my-app-history',        // IndexedDB database name
  namespace: 'my-app',              // Namespace for isolation
  maxMessages: 500,                 // Keep last 500 messages
  ttlSeconds: 24 * 60 * 60,        // 24 hours TTL
  gcIntervalMs: 60000,             // GC runs every minute
  debug: true
});

await history.attach(bus);

// On startup, fetch recent messages to rebuild state
const recent = await history.getHistory('cart.#', {
  limit: 200
});

for (const msg of recent) {
  // You can either re-publish into the bus or handle directly
  // Replaying via publish ensures normal delivery semantics
  bus.publish(msg.topic, msg.payload, { 
    source: msg.meta?.source,
    correlationId: msg.meta?.correlationId,
    schemaVersion: msg.schemaVersion
  });
}
```

## Query with Time Filter

```typescript
// Get messages from the last 5 minutes
const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
const recentMessages = await history.getHistory('orders.#', {
  fromTime: fiveMinutesAgo,
  limit: 50
});

console.log(`Found ${recentMessages.length} recent orders`);
```

## Wildcard Pattern Queries

```typescript
// Get all cart events
const cartEvents = await history.getHistory('cart.#');

// Get specific level events
const itemUpdates = await history.getHistory('cart.item.+', {
  limit: 100
});

// Exact topic match
const checkouts = await history.getHistory('cart.checkout', {
  fromTime: Date.now() - 3600000, // Last hour
  limit: 20
});
```

## Replay strategies

### Full replay
Republish stored messages so all subscribers handle them like live messages.

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app-history',
  namespace: 'my-app',
  maxMessages: 1000
});

await history.attach(bus);

// Replay all cart events on startup
const cartHistory = await history.getHistory('cart.#');
for (const msg of cartHistory) {
  bus.publish(msg.topic, msg.payload, {
    source: 'replay',
    correlationId: msg.meta?.correlationId
  });
}
```

### Time-based replay
Only replay messages after a specific timestamp.

```typescript
// Get last sync timestamp from localStorage
const lastSync = parseInt(localStorage.getItem('lastSync') || '0');

// Replay only new messages since last sync
const newMessages = await history.getHistory('app.#', {
  fromTime: lastSync,
  limit: 500
});

console.log(`Replaying ${newMessages.length} new messages`);
for (const msg of newMessages) {
  // Process message
  processMessage(msg);
}

// Update last sync timestamp
localStorage.setItem('lastSync', Date.now().toString());
```

### Topic-specific replay
Replay different topics with different strategies.

```typescript
// Critical events: replay all
const criticalEvents = await history.getHistory('orders.#');

// UI state: only last 10
const uiState = await history.getHistory('ui.state.+', {
  limit: 10
});

// Process in order
[...criticalEvents, ...uiState]
  .sort((a, b) => a.ts - b.ts)
  .forEach(msg => {
    bus.publish(msg.topic, msg.payload);
  });
```

## Cleanup & Retention

The History adapter automatically manages storage through garbage collection.

### Automatic Garbage Collection

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app-history',
  maxMessages: 1000,        // Global limit across all topics
  ttlSeconds: 3600,         // 1 hour TTL
  gcIntervalMs: 60000       // GC runs every minute
});

await history.attach(bus);

// GC automatically removes:
// 1. Messages older than ttlSeconds
// 2. Oldest messages when exceeding maxMessages
```

### Manual Garbage Collection

```typescript
// Force an immediate GC cycle
await history.forceGc();

console.log('Garbage collection completed');
```

### Clear All History

```typescript
// Clear all stored history for this namespace
await history.clearHistory();

console.log('All history cleared');
```

### Monitor Storage

```typescript
// Get current statistics
const stats = await history.getStats();

console.log(`Messages persisted: ${stats.messagesPersisted}`);
console.log(`Messages in storage: ${stats.estimatedStorageCount}`);
console.log(`GC cycles: ${stats.gcCyclesCompleted}`);
console.log(`Messages GC'd: ${stats.messagesGarbageCollected}`);
console.log(`Duplicates skipped: ${stats.duplicatesSkipped}`);

// Check if approaching limit
if (stats.estimatedStorageCount > stats.maxMessages * 0.9) {
  console.warn('Storage approaching limit');
  await history.forceGc();
}
```

### Namespace Isolation

```typescript
// Different namespaces for different apps/environments
const prodHistory = createHistoryAdapter({
  namespace: 'prod',
  maxMessages: 2000
});

const devHistory = createHistoryAdapter({
  namespace: 'dev',
  maxMessages: 500
});

// Each namespace is completely isolated
await prodHistory.attach(prodBus);
await devHistory.attach(devBus);
```

## Advanced Use Cases

### Event Sourcing

```typescript
// Store all domain events
const eventStore = createHistoryAdapter({
  dbName: 'event-store',
  namespace: 'orders',
  maxMessages: 10000,
  ttlSeconds: 30 * 24 * 60 * 60 // 30 days
});

await eventStore.attach(bus);

// Rebuild order state from events
async function rebuildOrderState(orderId: string) {
  const events = await eventStore.getHistory('orders.#');
  
  const orderEvents = events.filter(msg => 
    msg.payload.orderId === orderId
  );
  
  let state = {};
  for (const event of orderEvents.sort((a, b) => a.ts - b.ts)) {
    state = applyEvent(state, event);
  }
  
  return state;
}
```

### Audit Trail

```typescript
// Keep audit log of all user actions
const auditLog = createHistoryAdapter({
  dbName: 'audit-log',
  namespace: 'audit',
  maxMessages: 50000,
  ttlSeconds: 90 * 24 * 60 * 60 // 90 days retention
});

await auditLog.attach(bus);

// Query audit history
async function getUserActions(userId: string, startDate: Date) {
  const allEvents = await auditLog.getHistory('user.#', {
    fromTime: startDate.getTime()
  });
  
  return allEvents.filter(msg => 
    msg.payload.userId === userId
  );
}
```

### Debug Time Travel

```typescript
// Replay messages leading up to an error
async function debugIssue(errorTimestamp: number) {
  // Get 5 minutes of history before error
  const history = await historyAdapter.getHistory('app.#', {
    fromTime: errorTimestamp - 5 * 60 * 1000,
    limit: 1000
  });
  
  console.log('Events leading to error:', history);
  
  // Replay in test environment
  for (const msg of history) {
    testBus.publish(msg.topic, msg.payload);
  }
}
```

### Offline Queue

```typescript
// Store messages while offline
const offlineQueue = createHistoryAdapter({
  dbName: 'offline-queue',
  namespace: 'pending',
  maxMessages: 500,
  ttlSeconds: 7 * 24 * 60 * 60 // 7 days
});

await offlineQueue.attach(bus);

// When back online, sync pending messages
window.addEventListener('online', async () => {
  const pending = await offlineQueue.getHistory('sync.#');
  
  for (const msg of pending) {
    try {
      await syncToServer(msg);
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  }
  
  // Clear synced messages
  await offlineQueue.clearHistory();
});
```

## Error Handling

```typescript
const history = createHistoryAdapter({
  dbName: 'my-app-history',
  onError: (error) => {
    if (error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded');
      // Clear old data
      history.clearHistory().catch(console.error);
    } else if (error.name === 'InvalidStateError') {
      console.error('IndexedDB not available');
    } else {
      console.error('History adapter error:', error);
      // Send to error tracking
      errorTracker.captureException(error);
    }
  }
});

await history.attach(bus);
```

## Performance Tips

### Batch Queries

```typescript
// ❌ Bad: Multiple small queries
for (const topic of topics) {
  await history.getHistory(topic);
}

// ✅ Good: Single query with pattern
const events = await history.getHistory('app.#', { limit: 1000 });
```

### Limit Results

```typescript
// Always use limit for large datasets
const recent = await history.getHistory('metrics.#', {
  limit: 100  // Prevent loading too much data
});
```

### Clean Up Regularly

```typescript
// Schedule periodic cleanup
setInterval(async () => {
  const stats = await history.getStats();
  
  if (stats.estimatedStorageCount > 900) {
    await history.forceGc();
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

## Important Notes

### Idempotency

Stored messages may be replayed in addition to live deliveries. Ensure handlers are idempotent where appropriate.

```typescript
// ✅ Good: Idempotent handler
bus.subscribe('cart.item.add', (msg) => {
  const { itemId, quantity } = msg.payload;
  
  // Use set operation instead of increment
  cart.setItem(itemId, quantity);
});

// ❌ Bad: Non-idempotent handler
bus.subscribe('cart.item.add', (msg) => {
  const { itemId, quantity } = msg.payload;
  
  // Will add multiple times on replay!
  cart.incrementItem(itemId, quantity);
});
```

### Replay Marking

Consider marking replayed messages so handlers can distinguish them from live messages.

```typescript
// Mark as replay when republishing
for (const msg of recentMessages) {
  bus.publish(msg.topic, msg.payload, {
    source: 'replay',
    meta: { replay: true }
  });
}

// Handler can check for replay
bus.subscribe('orders.#', (msg) => {
  if (msg.meta?.replay) {
    // Handle replayed message differently
    updateUIQuietly(msg.payload);
  } else {
    // Handle live message with animations/notifications
    updateUIWithFeedback(msg.payload);
  }
});
```

### Cross-Tab Sharing

IndexedDB is shared across all tabs/windows of the same origin. Messages stored by one tab are visible to all tabs.

```typescript
// Tab 1: Store messages
const history1 = createHistoryAdapter({ namespace: 'shared' });
await history1.attach(bus1);
bus1.publish('user.login', { userId: '123' });

// Tab 2: Can read messages stored by Tab 1
const history2 = createHistoryAdapter({ namespace: 'shared' });
await history2.attach(bus2);
const messages = await history2.getHistory('user.#');
console.log(messages); // Includes message from Tab 1
```

### Detach Behavior

After detaching, the storage remains accessible for read operations.

```typescript
await history.attach(bus);
bus.publish('test', { value: 1 });

await history.detach();

// Still works! Storage reopens automatically
const messages = await history.getHistory('test');
console.log(messages); // Returns stored messages
```

## See Also

- [History Adapter API](/api/history) - Complete API reference
- [Adapters Guide](/guide/adapters/history) - Detailed adapter guide
- [Performance Tips](/guide/advanced/performance) - Optimization strategies
- [Cross-Tab Adapter](/api/cross-tab) - Multi-tab synchronization
