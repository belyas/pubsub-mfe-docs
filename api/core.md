# Core API Reference

Complete API documentation for the core PubSub MFE library.

## createPubSub()

Creates a new PubSub bus instance.

### Signature

```typescript
function createPubSub(config?: PubSubConfig): PubSubBus
```

### Parameters

#### `config` (optional)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `app` | `string` | `'default'` | Application identifier |
| `validationMode` | `ValidationMode` | `'off'` | Validation mode for all schemas |
| `maxHandlersPerTopic` | `number` | `50` | Maximum handlers per topic |
| `onMaxHandlersExceeded` | `throw, warn` | `throw` | Behavior when max handlers limit is exceeded |
| `debug` | `boolean` | `false` | Enable debug logging |
| `onDiagnostic` | `DiagnosticHandler` | `undefined` | Diagnostics hook for observability |
| `retention` | `RetentionConfig` | `undefined` | In-memory message retention for replay support |
| `rateLimit` | `RateLimitConfig` | `undefined` | Rate limiting configuration to prevent DoS from rogue microfrontends |

#### `RetentionConfig`

```typescript
interface RetentionConfig {
  maxMessages: number;
  perTopic?: Record<string, number>;
  ttlMs?: number;
}
```

#### `RateLimitConfig`

```typescript
interface RetentionConfig {
  maxPerSecond: number;
  maxBurst?: number;
  onExceeded?: "drop" | "throw";
}
```

### Returns

Returns a `PubSubBus` instance.

### Example

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

const bus = createPubSub({
  app: 'my-app',
  maxHandlersPerTopic: 20,
  debug: process.env.NODE_ENV === 'development',
  onHandlerError: (event: DiagnosticEvent) => {
    if (event.type === 'handler-error') {
      console.error(`Error in ${event.topic}:`, event.error);
      Sentry.captureException(event.error);
    }
  }
});
```

---

## PubSubBus

The main bus interface for publishing and subscribing to messages.

### Methods

#### `publish()`

Publishes a message to the bus.

```typescript
publish<T = unknown>(
  topic: Topic,
  payload: T,
  options?: PublishOptions = {}
): Message<T>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | `string` | Dot-separated topic (e.g., `'cart.item.add'`) |
| `payload` | `T` | Message payload |
| `options` | `PublishOptions` | Optional publish configuration |

**PublishOptions:**

```typescript
interface PublishOptions {
  source?: string;   // message origin
  schemaVersion?: SchemaVersion;  // schema version
  correlationId?: string; // Correlation ID for request-response tracing 
  meta?: Omit<MessageMeta, "source" | "correlationId">; // Additional metadata to attach
}
```

**Example:**

```typescript
// Simple publish
bus.publish('cart.item.add', { sku: 'ABC123', qty: 1 });

// With options
bus.publish('order.created', orderData, {
  source: 'checkout-service',
  schemaVersion: 'order.created#v1'
});
```

#### `subscribe()`

Subscribes to messages matching a topic pattern.

```typescript
subscribe<T = unknown>(
  pattern: TopicPattern,
  handler: MessageHandler<T>,
  options: SubscribeOptions = {}
): Unsubscribe
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string` | Topic pattern with/without wildcards (`+`, `#`) |
| `handler` | `MessageHandler<T>` | Callback function |
| `options` | `SubscribeOptions` | Optional subscription configuration |

**MessageHandler:**

```typescript
type MessageHandler<T = unknown> = (
  message: Message<T>
) => void | Promise<void> | unknown;
```

**SubscribeOptions:**

```typescript
interface SubscribeOptions {
  signal?: AbortSignal;    // Automatic cleanup
  replay?: number;         // Replay last N messages on subscribe from in-memory retention buffer
  sourceFilter?: {
    include?: string[];   // Whitelist sources
    exclude?: string[];   // Blacklist sources
  }
}
```

**Returns:** `Unsubscribe` function to remove the subscription.

**Example:**

```typescript
// Basic subscription
const unsubscribe = bus.subscribe('cart.item.+', (msg) => {
  console.log('Cart item action:', msg.topic, msg.payload);
});

// With AbortSignal
const controller = new AbortController();
bus.subscribe('cart.#', handler, {
  signal: controller.signal
});
controller.abort(); // Cleanup

// With source filtering
bus.subscribe('sync.#', handler, {
  sourceFilter: {
    exclude: ['sync-origin.com'] // Ignore own messages
  }
});

// With replaying 10 last messages
bus.subscribe('order.created', handler, {
  replay: 10
});
```

#### `registerSchema()`

Register a JSON schema for payload validation.

```typescript
registerSchema(schemaVersion: SchemaVersion, schema: JsonSchema): void
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `schemaVersion` | `SchemaVersion (string)` | Schema identifier with version (e.g., `cart.item.add@1`) |
| `schema` | `JsonSchema` | JSON Schema definition |

**JsonSchema:**

```typescript
interface JsonSchema {
  type?: "string" | "number" | "boolean" | "object" | "array" | "null" | undefined;
  properties?: Record<string, JsonSchema> | undefined;
  items?: JsonSchema | undefined;
  required?: string[] | undefined;
  additionalProperties?: boolean | undefined;
  enum?: unknown[] | undefined;
  minimum?: number | undefined;
  maximum?: number | undefined;
  minLength?: number | undefined;
  maxLength?: number | undefined;
  pattern?: string | undefined;
}
```

**Example:**

```typescript
bus.registerSchema('cart.item.add@1', {
  type: 'object',
  properties: { sku: { type: 'string' }, qty: { type: 'number' } },
  required: ['sku', 'qty'],
});
```

#### `getHistory()`

Get message history for a topic pattern.

```typescript
async getHistory<T = unknown>(
  topic: Topic,
  options: { fromTime?: number; limit?: number } = {}
): Promise<Message<T>[]>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | `Topic (string)` | Topic pattern to filter (supports wildcards) |
| `options` | `{ fromTime?: number; limit?: number }` | History query options |

**Example:**

```typescript
const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
const history = await bus.getHistory('cart.#', {
  fromTime: fiveMinutesAgo,
  limit: 10
});
```

#### `getHooks()`

Get hooks for adapter integration.

```typescript
getHooks(): BusHooks;
```

#### `handlerCount()`

Get current handler count for a pattern.

```typescript
handlerCount(pattern?: TopicPattern): number
```

#### `clear()`

Clear all subscriptions.

```typescript
clear(): void
```

#### `dispose()`

Disposes the bus and removes all subscriptions.

```typescript
dispose(): void
```

**Example:**

```typescript
// Cleanup on app shutdown
window.addEventListener('beforeunload', () => {
  bus.dispose();
});
```

---

## PubSub Message

The standard message format for all pub/sub communication.

### Interface

```typescript
interface Message<T = unknown> {
  readonly id: MessageId;
  readonly topic: Topic;
  readonly ts: Timestamp;
  readonly schemaVersion?: SchemaVersion;
  readonly payload: T;
  readonly meta?: MessageMeta;
}
```

### Example

```typescript
{
  id: 'f7fef1eb-7ef5-4c93-9e8b-41c9ddb3bd7a',
  topic: 'cart.item.add',
  payload: { sku: 'ABC123', qty: 1, price: 29.99 },
  ts: 1704067200000,
  schemaVersion: 'cart.item.add@v1',
  meta: {
    source: 'cart-mfe'
  }
}
```

---

## Topic Patterns

### Syntax Rules

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `exact.topic` | Exact match only | `exact.topic` |
| `domain.+.action` | Single-level wildcard | `domain.entity.action` |
| `domain.#` | Multi-level wildcard | `domain.*`, `domain.entity.*` |
| `#` | Match all topics | Everything |

### Pattern Examples

```typescript
// Exact match
bus.subscribe('cart.item.add', handler);
// Matches: cart.item.add
// Doesn't match: cart.item.remove, cart.promo.add

// Single-level wildcard
bus.subscribe('cart.+.add', handler);
// Matches: cart.item.add, cart.promo.add
// Doesn't match: cart.item.detail.add

// Multi-level wildcard
bus.subscribe('cart.#', handler);
// Matches: cart.item.add, cart.checkout.complete, cart.anything.deep.nested

// Global wildcard
bus.subscribe('#', handler);
// Matches: All topics
```

### Validation Rules

- Topics must use dot (`.`) separators
- Wildcards (`+`, `#`) can only appear as complete segments
- `#` must be the last segment if used
- Empty segments are not allowed

```typescript
// ✅ Valid patterns
'cart.item.add'
'cart.+.update'
'cart.#'
'user.profile.+'
'#'

// ❌ Invalid patterns
'cart..item'        // Empty segment
'cart.#.item'       // # not at end
'cart.ite+m.add'   // + not complete segment
'cart.item.'        // Trailing dot
```

---

## Error Handling

### Handler Isolation

PubSub MFE uses the **bulkhead pattern** to isolate handler errors:

```typescript
bus.subscribe('cart.#', () => {
  throw new Error('Handler 1 fails');
  // Error is caught, logged, and doesn't propagate
});

bus.subscribe('cart.#', () => {
  console.log('Handler 2 still executes');
  // ✅ This handler runs independently
});
```

### Error Diagnostics

Monitor handler errors with diagnostics hooks:

```typescript
const bus = createPubSub({
  app: 'my-app',
  onDiagnostic: (event: DiagnosticEvent) => {
    if (event.type === 'handler-error') {
      console.error(`Handler error on ${event.topic}:`, event.error);
      // Custom error handling
      errorTracker.log({
        error: event.error,
        topic: event.topic,
        handlerIndex: event.handlerIndex,
        messageId: event.messageId,
        timestamp: Date.now()
      });
    }
  }
});
```

---

## Type Safety

### Generic Payload Types

Type-safe message payloads:

```typescript
interface CartItem {
  sku: string;
  qty: number;
  price: number;
}

// Type-safe publish
bus.publish<CartItem>('cart.item.add', {
  sku: 'ABC123',
  qty: 1,
  price: 29.99
});

// Type-safe subscribe
bus.subscribe<CartItem>('cart.item.add', (msg) => {
  const { sku, qty, price } = msg.payload;
  // ✅ All properties are type-checked
});
```

---

## Best Practices

### 1. Use Meaningful Topics

```typescript
// ✅ Good: Clear, hierarchical
'inventory.product.update'
'user.profile.created'
'payment.transaction.completed'

// ❌ Bad: Vague, flat
'update'
'event'
'data'
```

### 2. Implement Cleanup

```typescript
// ✅ Good: Automatic cleanup
useEffect(() => {
  const controller = new AbortController();
  bus.subscribe('cart.#', handler, { signal: controller.signal });
  return () => controller.abort();
}, []);

// ❌ Bad: Memory leak
useEffect(() => {
  bus.subscribe('cart.#', handler); // Never cleaned up!
}, []);
```

### 3. Validate Payloads

```typescript
// ✅ Good
bus.subscribe('order.created', (msg) => {
  if (!isValidOrder(msg.payload)) {
    console.error('Invalid order payload:', msg.payload);
    return;
  }
  processOrder(msg.payload);
});
```

### 4. Handle Errors Gracefully

```typescript
bus.subscribe('critical.operation', (msg) => {
  try {
    processCriticalOperation(msg.payload);
  } catch (error) {
    console.error('Operation failed:', error);
    // Fallback logic
    showUserError();
    logToMonitoring(error);
  }
});
```

---

## Performance Tips

### 1. Use Specific Patterns

```typescript
// ✅ Better: Specific pattern
bus.subscribe('cart.item.+', handler); // Only cart item actions

// ❌ Slower: Too broad
bus.subscribe('cart.#', handler); // All cart events
```

### 2. Batch Updates

```typescript
// ✅ Better: Batch multiple updates
const updates = [item1, item2, item3];
bus.publish('cart.items.batch.update', { items: updates });

// ❌ Slower: Individual updates
updates.forEach(item => {
  bus.publish('cart.item.update', item);
});
```

### 3. Throttle High-Frequency Handlers

```typescript
import { throttle } from 'lodash-es';

const throttledHandler = throttle((msg) => {
  updateUI(msg.payload);
}, 100); // Max once per 100ms

bus.subscribe('realtime.price.#', throttledHandler);
```

---

## Next Steps

- **[Cross-Tab API](/api/cross-tab)** - Cross-tab adapter reference
- **[History API](/api/history)** - History adapter reference
- **[Types](/api/types)** - Complete TypeScript types
- **[Examples](/examples/basic)** - Practical usage examples
