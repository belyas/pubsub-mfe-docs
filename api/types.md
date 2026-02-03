# TypeScript Types

Complete TypeScript type definitions for the PubSub MFE library.

## Core Types

### PubSubBus

The main PubSub bus interface.

```typescript
interface PubSubBus {
  subscribe<T = unknown>(
    pattern: TopicPattern,
    handler: MessageHandler<T>,
    options?: SubscribeOptions
  ): Unsubscribe;
  
  publish<T = unknown>(
    topic: Topic,
    payload: T,
    options?: PublishOptions
  ): Message<T>;
  
  registerSchema(schemaVersion: SchemaVersion, schema: JsonSchema): void;
  
  getHistory<T = unknown>(
    topic: Topic,
    options?: { fromTime?: number; limit?: number }
  ): Promise<Message<T>[]>;
  
  handlerCount(pattern?: TopicPattern): number;
  
  clear(): void;
  
  dispose(): void;

  getHooks(): BusHooks;
}
```

### PubSubConfig

Configuration for creating a PubSub bus.

```typescript
interface PubSubConfig {
  app?: string;                             // Application identifier for namespacing
  validationMode?: ValidationMode;          // Default validation mode (default: 'off')
  onDiagnostic?: DiagnosticHandler;         // Diagnostics hook for observability
  maxHandlersPerTopic?: number;             // Max handlers per topic (default: 50)
  onMaxHandlersExceeded?: 'throw' | 'warn'; // Behavior on max handlers (default: 'throw')
  debug?: boolean;                          // Debug logging (default: false)
  retention?: RetentionConfig;              // In-memory message retention
  rateLimit?: RateLimitConfig;              // Rate limiting configuration
}

type ValidationMode = 'strict' | 'warn' | 'off';
```

### Message

Standard message format.

```typescript
interface Message<T = unknown> {
  readonly id: MessageId;           // Unique message ID (UUID v4)
  readonly topic: Topic;            // Message topic
  readonly ts: Timestamp;           // Creation timestamp (ms)
  readonly payload: T;              // Message data
  readonly schemaVersion?: SchemaVersion; // Optional schema version
  readonly meta?: MessageMeta;      // Optional metadata
}

type MessageId = string;
type Timestamp = number;
type Topic = string;
type SchemaVersion = string;
```

### MessageMeta

Additional message information.

```typescript
interface MessageMeta {
  readonly source?: string;         // Message source (component/microfrontend ID)
  readonly correlationId?: string;  // Request correlation ID
  readonly [key: string]: unknown;  // Custom properties
}
```

---

## Publish/Subscribe Types

### PublishOptions

Options for publishing messages.

```typescript
interface PublishOptions {
  source?: string;              // Source identifier for the publisher
  schemaVersion?: SchemaVersion; // Schema version to validate against
  correlationId?: string;       // Correlation ID for tracing
  meta?: Omit<MessageMeta, 'source' | 'correlationId'>; // Additional metadata
}
```

### SubscribeOptions

Options for subscribing to topics.

```typescript
interface SubscribeOptions {
  signal?: AbortSignal;         // AbortSignal for lifecycle management
  replay?: number;              // Replay last N messages (default: 0)
  sourceFilter?: {              // Filter messages by source
    include?: string[];
    exclude?: string[];
  };
}
```

### MessageHandler

Callback function for handling messages.

```typescript
type MessageHandler<T = unknown> = (
  message: Message<T>
) => void | Promise<void> | unknown;
```

### Unsubscribe

Function to remove a subscription.

```typescript
type Unsubscribe = () => void;
```

### TopicPattern

Topic pattern with wildcards.

```typescript
type TopicPattern = string; // Supports '+' and '#' wildcards

// Examples:
// 'users.created'        - Exact match
// 'users.+'              - Single-level wildcard
// 'users.#'              - Multi-level wildcard
// 'users.+.updated'      - Wildcard in middle
```

---

## Validation Types

### JsonSchema

JSON Schema for payload validation.

```typescript
interface JsonSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  additionalProperties?: boolean;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
```

### ValidationResult

Result of schema validation.

```typescript
interface ValidationResult {
  readonly valid: boolean;           // Validation passed
  readonly errors?: readonly ValidationError[]; // Validation errors
}

interface ValidationError {
  readonly path: string;             // Error path
  readonly message: string;          // Error message
  readonly expected?: string;        // Expected value/type
  readonly actual?: unknown;         // Actual value
}
```

---

## Retention Types

### RetentionConfig

Configuration for in-memory message retention.

```typescript
interface RetentionConfig {
  maxMessages: number;          // Max retained messages globally
  perTopic?: Record<string, number>; // Per-topic retention limits
  ttlMs?: number;               // Time-to-live in milliseconds
}
```

### RateLimitConfig

Configuration for rate limiting.

```typescript
interface RateLimitConfig {
  maxPerSecond: number;     // Maximum messages per second
  maxBurst?: number;        // Maximum burst size
  onExceeded?: 'drop' | 'throw'; // Action on rate limit (default: 'drop')
}
```

---

## Adapter Types

### Adapter

Base adapter interface.

```typescript
interface Adapter {
  attach(bus: PubSubBus): Promise<void> | void;
  detach(): Promise<void> | void;
}
```

### BusHooks

Hook interface for adapter integration.

```typescript
interface BusHooks {
  onPublish(listener: (message: Message) => void): Unsubscribe;
  dispatchExternal(message: Message): void;
}
```

### CrossTabAdapter

Cross-tab synchronization adapter.

```typescript
interface CrossTabAdapter extends Adapter {
  reconnect(): void;
  getStats(): CrossTabStats;
}

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
  clientId: string;
}
```

### HistoryAdapter

Event history storage adapter.

```typescript
interface HistoryAdapter extends Adapter {
  getHistory<T = unknown>(
    topic: Topic,
    options?: HistoryQueryOptions
  ): Promise<Message<T>[]>;
  clearHistory(): Promise<void>;
  getStats(): Promise<HistoryStats>;
  forceGc(): Promise<void>;
}

interface HistoryQueryOptions {
  fromTime?: number;        // From timestamp (ms)
  limit?: number;           // Max results
}

interface HistoryStats {
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

### IframeHost

Iframe host adapter.

```typescript
interface IframeHost extends Adapter {
  registerIframe(iframe: HTMLIFrameElement, origin: string): Promise<void>;
  unregisterIframe(iframe: HTMLIFrameElement): void;
  getStats(): IframeHostStats;
}

interface IframeHostStats {
  totalIframes: number;
  connectedIframes: number;
  messagesSent: number;
  messagesReceived: number;
  handshakesFailed: number;
  messagesDropped: number;
  validationErrors: number;
}
```

### IframeClient

Iframe client adapter.

```typescript
interface IframeClient {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  publish(topic: string, payload: unknown, options?: { schemaVersion?: string }): void;
  subscribe(topic: string, handler: (message: ReceivedMessage) => void): () => void;
  isConnected(): boolean;
  getStats(): IframeClientStats;
}

interface IframeClientStats {
  connected: boolean;
  messagesPublished: number;
  messagesReceived: number;
  connectionAttempts: number;
  disconnections: number;
}

interface ReceivedMessage {
  messageId: string;
  topic: string;
  payload: unknown;
  timestamp: number;
  schemaVersion?: string;
  source?: string;
}
```

---

## Transport Types

### Transport

Base transport interface for cross-tab adapters.

```typescript
interface Transport {
  send(envelope: CrossTabEnvelope): void;
  onMessage(handler: (envelope: CrossTabEnvelope) => void): () => void;
  close(): void;
  isAvailable(): boolean;
}
```

### CrossTabEnvelope

Message envelope for cross-tab communication.

```typescript
interface CrossTabEnvelope<T = unknown> {
  messageId: string;
  clientId: string;
  sequence?: number;
  topic: string;
  payload: T;
  timestamp: number;
  source?: string;
  schemaVersion?: string;
  meta?: Record<string, unknown>;
  version: number;
  origin: string;
}
```

---

## Configuration Types

### CrossTabAdapterConfig

```typescript
interface CrossTabAdapterConfig {
  channelName?: string;             // Channel name (default: 'pubsub-mfe')
  transport: Transport;             // Transport instance (required)
  clientId?: string;                // Client ID (auto-generated if not provided)
  enableLeadership?: boolean;       // Enable leadership detection (default: false)
  emitSystemEvents?: boolean;       // Emit system events (default: true)
  maxMessageSize?: number;          // Max message size in bytes (default: 262144)
  rateLimit?: {
    maxPerSecond: number;           // Max messages per second (default: 100)
    maxBurst: number;               // Max burst size (default: 200)
  };
  expectedOrigin?: string;          // Expected origin (default: window.location.origin)
  dedupeWindowMs?: number;          // Deduplication window (default: 60000)
  dedupeCacheSize?: number;         // Dedup cache size (default: 1000)
  batchIntervalMs?: number;         // Batch interval (default: 10)
  maxBatchSize?: number;            // Max batch size (default: 50)
  debug?: boolean;                  // Debug logging (default: false)
  onError?: (error: Error) => void; // Error handler
}
```

### HistoryAdapterConfig

```typescript
interface HistoryAdapterConfig {
  dbName?: string;              // IndexedDB database name (default: 'pubsub-history')
  namespace?: string;           // Namespace prefix (default: 'default')
  maxMessages?: number;         // Max messages to persist (default: 1000)
  ttlSeconds?: number;          // TTL in seconds (default: 3600)
  gcIntervalMs?: number;        // GC interval (default: 60000)
  debug?: boolean;              // Debug logging (default: false)
  onError?: (error: Error) => void; // Error handler
}
```

### IframeHostConfig

```typescript
interface IframeHostConfig {
  trustedOrigins: string[];         // Trusted origins (required)
  handshakeTimeout?: number;        // Handshake timeout (default: 5000)
  maxRetries?: number;              // Max handshake retries (default: 2)
  autoReconnect?: boolean;          // Auto-reconnect on reload (default: true)
  enforceSchemaValidation?: boolean; // Enforce schema validation (default: false)
  debug?: boolean;                  // Debug logging (default: false)
  onHandshakeComplete?: (iframe: HTMLIFrameElement, clientId: string) => void;
  onHandshakeFailed?: (iframe: HTMLIFrameElement, origin: string, error: Error) => void;
  onIframeDisconnected?: (iframe: HTMLIFrameElement, reason: DisconnectReason) => void;
  onValidationError?: (iframe: HTMLIFrameElement, topic: string, error: Error) => void;
}

type DisconnectReason = 
  | 'send_failed'
  | 'removed_from_dom'
  | 'explicit_disconnect'
  | 'timeout'
  | 'handshake_failed';
```

### IframeClientConfig

```typescript
interface IframeClientConfig {
  expectedHostOrigin: string;       // Expected host origin (required)
  handshakeTimeout?: number;        // Handshake timeout (default: 5000)
  autoReconnect?: boolean;          // Auto-reconnect (default: true)
  debug?: boolean;                  // Debug logging (default: false)
  onConnected?: (hostClientId: string) => void;
  onDisconnected?: (reason: DisconnectReason) => void;
}
```

---

## Utility Types

### DiagnosticHandler

Diagnostics hook for observability.

```typescript
type DiagnosticHandler = (event: DiagnosticEvent) => void;

type DiagnosticEvent =
  | DiagnosticPublish
  | DiagnosticSubscribe
  | DiagnosticUnsubscribe
  | DiagnosticHandlerError
  | DiagnosticValidationError
  | DiagnosticWarning
  | DiagnosticLimitExceeded
  | DiagnosticRateLimited;

interface DiagnosticPublish {
  readonly type: 'publish';
  readonly topic: Topic;
  readonly messageId: MessageId;
  readonly handlerCount: number;
  readonly durationMs: number;
}

interface DiagnosticValidationError {
  readonly type: 'validation-error';
  readonly topic: Topic;
  readonly schemaVersion: SchemaVersion;
  readonly errors: readonly ValidationError[];
  readonly mode: ValidationMode;
}

// ... other diagnostic types
```

### CompiledMatcher

Compiled topic matcher for efficient matching.

```typescript
interface CompiledMatcher {
  readonly pattern: TopicPattern;
  readonly hasWildcards: boolean;
  readonly segments: MatcherSegment[];
}

type MatcherSegment =
  | { readonly type: 'literal'; readonly value: string }
  | { readonly type: 'single' }  // +
  | { readonly type: 'multi' };  // #
```

---

## Generic Utility Types

### DeepPartial

Make all properties optional recursively.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

---

## Usage Examples

### Type-Safe Publishing

```typescript
interface UserCreatedPayload {
  userId: string;
  email: string;
  name: string;
}

// Type-safe publish
bus.publish<UserCreatedPayload>('users.created', {
  userId: '123',
  email: 'user@example.com',
  name: 'John Doe'
});

// Type error: missing required field
bus.publish<UserCreatedPayload>('users.created', {
  userId: '123',
  email: 'user@example.com'
  // ❌ Error: Property 'name' is missing
});
```

### Type-Safe Subscribing

```typescript
interface OrderCreatedPayload {
  orderId: string;
  total: number;
  items: Array<{ id: string; quantity: number }>;
}

bus.subscribe<OrderCreatedPayload>(
  'orders.created',
  (message) => {
    // message.payload is typed as OrderCreatedPayload
    console.log(`Order ${message.payload.orderId}`);
    console.log(`Total: $${message.payload.total}`);
  }
);
```

### Custom Message Handling

```typescript
function createLogger<T>(prefix: string): MessageHandler<T> {
  return (message) => {
    console.log(`[${prefix}]`, message.topic, message.payload);
  };
}

bus.subscribe('users.#', createLogger<UserPayload>('USER'));
bus.subscribe('orders.#', createLogger<OrderPayload>('ORDER'));
```

### Using AbortSignal

```typescript
const controller = new AbortController();

bus.subscribe('cart.#', (message) => {
  console.log('Cart event:', message);
}, { signal: controller.signal });

// Later: unsubscribe via abort
controller.abort();
```

### Replay Messages

```typescript
// Replay last 5 messages on subscribe
bus.subscribe('cart.#', (message) => {
  console.log('Cart event:', message);
}, { replay: 5 });
```

---

## Type Exports

All types are exported from the main entry point:

```typescript
import type {
  // Core
  PubSubBus,
  PubSubConfig,
  Message,
  MessageMeta,
  MessageId,
  Timestamp,
  Topic,
  SchemaVersion,
  
  // Publish/Subscribe
  PublishOptions,
  SubscribeOptions,
  MessageHandler,
  Unsubscribe,
  TopicPattern,
  
  // Validation
  JsonSchema,
  ValidationResult,
  ValidationError,
  ValidationMode,
  
  // Retention & Rate Limiting
  RetentionConfig,
  RateLimitConfig,
  
  // Diagnostics
  DiagnosticHandler,
  DiagnosticEvent,
  
  // Adapters
  Adapter,
  BusHooks,
  
  // Topic Matching
  CompiledMatcher,
  MatcherSegment
} from '@belyas/pubsub-mfe';

// Cross-Tab adapter types
import type {
  CrossTabAdapter,
  CrossTabAdapterConfig,
  CrossTabStats,
  CrossTabEnvelope,
  Transport,
  ClientId
} from '@belyas/pubsub-mfe/adapters/cross-tab';

// History adapter types
import type {
  HistoryAdapter,
  HistoryAdapterConfig,
  HistoryQueryOptions,
  HistoryStats
} from '@belyas/pubsub-mfe/adapters/history';

// Iframe adapter types
import type {
  IframeHost,
  IframeClient,
  IframeHostConfig,
  IframeClientConfig,
  IframeHostStats,
  IframeClientStats,
  DisconnectReason
} from '@belyas/pubsub-mfe/adapters/iframe';
```

---

## Next Steps

- **[Core API](/api/core)** - Core PubSub API reference
- **[Cross-Tab API](/api/cross-tab)** - Cross-tab adapter API
- **[History API](/api/history)** - History adapter API
- **[Iframe API](/api/iframe)** - Iframe adapter API
- **[Getting Started](/guide/getting-started)** - Usage guide

::: tip 💡 TypeScript Tip
Enable `strict` mode in tsconfig.json for best type safety:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```
:::
