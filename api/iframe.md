# Iframe Adapter API

Complete API reference for the Iframe adapter with secure MessageChannel-based communication.

## Overview

The Iframe adapter enables secure pub/sub communication between a host application and sandboxed iframe microfrontends. It uses MessageChannel for dedicated, secure communication channels and implements a robust handshake protocol.

**Key Features:**
- **Secure MessageChannel**: Dedicated port per iframe
- **Handshake Protocol**: SYN → ACK → ACK_CONFIRM
- **Origin Validation**: Trusted origins on every message
- **Auto-Reconnect**: Automatic reconnection on iframe reload
- **Passive Disconnect Detection**: Detects removed iframes via MutationObserver
- **Schema Validation**: Optional schema enforcement for iframe messages

---

## IframeHost API

### createIframeHost()

Creates a host-side adapter for managing iframe communication.

### Signature

```typescript
function createIframeHost(
  bus: PubSubBus,
  config: IframeHostConfig
): IframeHost
```

### Parameters

```typescript
interface IframeHostConfig {
  trustedOrigins: string[];           // Trusted origins that can communicate
  handshakeTimeout?: number;          // Handshake timeout in ms (default: 5000)
  maxRetries?: number;                // Max handshake retries (default: 2)
  autoReconnect?: boolean;            // Auto-reconnect on reload (default: true)
  enforceSchemaValidation?: boolean;  // Enforce schemas for iframe messages (default: false)
  debug?: boolean;                    // Enable debug logging
  onHandshakeComplete?: (iframe: HTMLIFrameElement, clientId: string) => void;
  onHandshakeFailed?: (iframe: HTMLIFrameElement, origin: string, error: Error) => void;
  onIframeDisconnected?: (iframe: HTMLIFrameElement, reason: DisconnectReason) => void;
  onValidationError?: (iframe: HTMLIFrameElement, topic: string, error: Error) => void;
}
```

### Returns

`IframeHost` instance

### Example

```typescript
import {
  createIframeHost,
  IframeHost
} from '@belyas/pubsub-mfe/adapters/iframe';

const host = createIframeHost(bus, {
  trustedOrigins: ['https://widget.example.com'],
  handshakeTimeout: 5000,
  autoReconnect: true,
  debug: true,
  onHandshakeComplete: (iframe, clientId) => {
    console.log(`Iframe connected: ${clientId}`);
  }
});

//  OR
const host = new IframeHost(config);
host.attach(bus);
```

---

## IframeHost

### Methods

#### `attach(bus)`

Attaches the host adapter to a PubSub bus.

```typescript
attach(bus: PubSubBus): void
```

**Example:**
```typescript
const bus = createPubSub();
host.attach(bus);

// Now ready to register iframes
```

#### `detach()`

Detaches the adapter and disconnects all iframes.

```typescript
detach(): void
```

**Example:**
```typescript
host.detach();
// All iframes disconnected, resources cleaned up
```

#### `registerIframe(iframe, origin)`

Registers an iframe for pub/sub communication.

```typescript
async registerIframe(
  iframe: HTMLIFrameElement,
  origin: string
): Promise<void>
```

**Parameters:**
- `iframe` - The iframe element to register
- `origin` - Expected origin of the iframe content

**Example:**

```typescript
const iframe = document.querySelector('#widget-iframe');

await host.registerIframe(iframe, 'https://widget.example.com');

// Iframe is now connected and can send/receive messages
```

#### `unregisterIframe(iframe)`

Unregisters an iframe and disconnects communication.

```typescript
unregisterIframe(iframe: HTMLIFrameElement): void
```

**Example:**

```typescript
const iframe = document.querySelector('#widget-iframe');
host.unregisterIframe(iframe);

// Iframe disconnected gracefully
```

#### `getStats()`

Returns adapter statistics.

```typescript
getStats(): IframeHostStats

interface IframeHostStats {
  totalIframes: number;          // Total iframes registered
  connectedIframes: number;      // Currently connected iframes
  messagesSent: number;          // Messages sent to iframes
  messagesReceived: number;      // Messages received from iframes
  handshakesFailed: number;      // Failed handshakes
  messagesDropped: number;       // Messages dropped (disconnected iframe)
  validationErrors: number;      // Schema validation failures
}
```

**Example:**

```typescript
const stats = host.getStats();
console.log(`Connected: ${stats.connectedIframes}/${stats.totalIframes}`);
console.log(`Messages sent: ${stats.messagesSent}`);
```

---

## IframeClient API

### createIframeClient()

Creates a client-side adapter for iframe microfrontends.

### Signature

```typescript
async function createIframeClient(
  config: IframeClientConfig
): Promise<IframeClient>
```

### Parameters

```typescript
interface IframeClientConfig {
  expectedHostOrigin: string;     // Expected origin of host application
  handshakeTimeout?: number;      // Handshake timeout in ms (default: 5000)
  autoReconnect?: boolean;        // Auto-reconnect on disconnect (default: true)
  debug?: boolean;                // Enable debug logging
  onConnected?: (hostClientId: string) => void;
  onDisconnected?: (reason: DisconnectReason) => void;
}
```

### Returns

`IframeClient` instance

### Example

```typescript
import {
  createIframeClient,
  IframeClient
} from '@belyas/pubsub-mfe/adapters/iframe';

const client = createIframeClient({
  expectedHostOrigin: 'https://app.example.com',
  autoReconnect: true,
  onConnected: (hostClientId: string) => {
    console.log('Connected to host:', hostClientId);
  }
});

// OR
const client = new IframeClient(config);
await client.connect();
```

---

## IframeClient

### Methods

#### `connect()`

Initiates connection to host and waits for handshake completion.

```typescript
async connect(): Promise<void>
```

**Example:**
```typescript
await client.connect();
console.log('Connected and ready');

// Can now publish/subscribe
```

#### `disconnect()`

Explicitly disconnects from host.

```typescript
disconnect(): void
```

**Example:**
```typescript
// User closes widget
client.disconnect();
```

#### `publish(topic, payload, options)`

Publishes a message to the host bus.

```typescript
publish(
  topic: string,
  payload: unknown,
  options?: {
    schemaVersion?: string;
  }
): void
```

**Example:**

```typescript
client.publish('cart.item.added', {
  itemId: '123',
  quantity: 2
});

// With schema version
client.publish('cart.item.added', {
  itemId: '123',
  quantity: 2
}, {
  schemaVersion: 'v1'
});
```

#### `subscribe(topic, handler)`

Subscribes to messages from the host bus.

```typescript
subscribe(
  topic: string,
  handler: (message: ReceivedMessage) => void
): () => void

interface ReceivedMessage {
  messageId: string;
  topic: string;
  payload: unknown;
  timestamp: number;
  schemaVersion?: string;
  source?: string;
}
```

**Returns:** Unsubscribe function

**Example:**

```typescript
// Subscribe to specific topic
const unsubscribe = client.subscribe('user.updated', (message) => {
  console.log('User updated:', message.payload);
});

// Subscribe with wildcard
client.subscribe('cart.#', (message) => {
  console.log('Cart event:', message.topic, message.payload);
});

// Unsubscribe
unsubscribe();
```

#### `getStats()`

Returns client statistics.

```typescript
getStats(): IframeClientStats

interface IframeClientStats {
  connected: boolean;            // Connection state
  messagesPublished: number;     // Messages published to host
  messagesReceived: number;      // Messages received from host
  connectionAttempts: number;    // Connection attempts
  disconnections: number;        // Times disconnected
}
```

**Example:**

```typescript
const stats = client.getStats();
console.log(`Connected: ${stats.connected}`);
console.log(`Messages: ${stats.messagesPublished} sent, ${stats.messagesReceived} received`);
```

---

## Handshake Protocol

The iframe adapter uses a three-way handshake protocol:

```
Host                          Iframe
  |                              |
  |-------- SYN ---------------->|  Host initiates
  |                              |
  |<------- ACK ----------------|  Iframe responds with clientId
  |                              |
  |--- ACK_CONFIRM + port2 ----->|  Host confirms with MessagePort
  |                              |
  |<==== MessageChannel =======>|  Secure communication established
```

### Protocol Messages

```typescript
// 1. SYN - Host to Iframe
interface IframeSynEnvelope {
  type: "pubsub:SYN";
  version: number;
}

// 2. ACK - Iframe to Host
interface IframeAckEnvelope {
  type: "pubsub:ACK";
  version: number;
  clientId: string;
  capabilities: string[];
}

// 3. ACK_CONFIRM - Host to Iframe (with MessagePort)
interface IframeAckConfirmEnvelope {
  type: "pubsub:ACK_CONFIRM";
  version: number;
}
```

---

## Disconnect Reasons

```typescript
type DisconnectReason =
  | "send_failed"            // MessagePort.postMessage() failed
  | "removed_from_dom"       // Iframe removed from DOM
  | "explicit_disconnect"    // Client called disconnect()
  | "timeout"                // Handshake timeout
  | "handshake_failed";      // Handshake failed after retries
```

---

## Usage Examples

### Host Application

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import { createIframeHost } from '@belyas/pubsub-mfe/adapters/iframe';

// Create bus
const bus = createPubSub();

// Create host adapter
const host = createIframeHost(bus, {
  trustedOrigins: [
    'https://cart-widget.example.com',
    'https://chat-widget.example.com'
  ],
  autoReconnect: true,
  onHandshakeComplete: (iframe, clientId) => {
    console.log(`Widget connected: ${clientId}`);
  }
});

// Register iframes
const cartIframe = document.querySelector('#cart-widget');
await host.registerIframe(cartIframe, 'https://cart-widget.example.com');

const chatIframe = document.querySelector('#chat-widget');
await host.registerIframe(chatIframe, 'https://chat-widget.example.com');

// Subscribe to iframe events
bus.subscribe('cart.#', (message) => {
  console.log('Cart event:', message);
});

// Publish to iframes
bus.publish('user.logged-in', {
  userId: '123',
  name: 'John Doe'
});
```

### Iframe Client

```typescript
import { createIframeClient } from '@belyas/pubsub-mfe/adapters/iframe';

const client = createIframeClient({
  expectedHostOrigin: 'https://app.example.com',
  onConnected: () => {
    console.log('Connected to host app');
    
    // Notify ready
    client.publish('cart.widget.ready', {});
  }
});

// Connect to host
await client.connect();

// Subscribe to host events
client.subscribe('user.logged-in', (message) => {
  console.log('User logged in:', message.payload);
  updateUI(message.payload);
});

client.subscribe('cart.#', (message) => {
  console.log('Cart event:', message.topic);
});

// Publish events to host
document.querySelector('#add-to-cart').addEventListener('click', () => {
  client.publish('cart.item.added', {
    itemId: '123',
    quantity: 1,
    price: 29.99
  });
});
```

---

## Advanced Usage

### Dynamic Iframe Loading

```typescript
const host = createIframeHost(bus, {
  trustedOrigins: ['https://widgets.example.com']
});

// Dynamically load and register iframe
async function loadWidget(widgetUrl: string) {
  const iframe = document.createElement('iframe');
  iframe.src = widgetUrl;
  iframe.sandbox = 'allow-scripts allow-same-origin';
  
  document.body.appendChild(iframe);
  
  // Wait for load
  await new Promise(resolve => {
    iframe.addEventListener('load', resolve);
  });
  
  // Register for communication
  await host.registerIframe(iframe, 'https://widgets.example.com');
  
  return iframe;
}

const cartWidget = await loadWidget('https://widgets.example.com/cart');
```

### Schema Validation

```typescript
// Host enforces schema validation
const host = createIframeHost(bus, {
  trustedOrigins: ['https://widget.example.com'],
  enforceSchemaValidation: true,
  onValidationError: (iframe, topic, error) => {
    console.error(`Invalid message from iframe: ${topic}`, error);
  }
});

// Register schemas on bus
bus.registerSchema('cart.item.added@v1', {
  type: 'object',
  required: ['itemId', 'quantity'],
  properties: {
    itemId: { type: 'string' },
    quantity: { type: 'number', minimum: 1 }
  }
});

// Iframe publishes with schema version
client.publish('cart.item.added', {
  itemId: '123',
  quantity: 2
}, {
  schemaVersion: 'cart.item.added@v1'
});
```

### Multiple Iframes Communication

```typescript
// Host broadcasts to all iframes
bus.publish('theme.changed', {
  theme: 'dark'
});

// All connected iframes receive the message
// Cart widget
client.subscribe('theme.changed', (message) => {
  applyTheme(message.payload.theme);
});

// Chat widget
client.subscribe('theme.changed', (message) => {
  applyTheme(message.payload.theme);
});
```

### Graceful Disconnect

```typescript
// Iframe client
window.addEventListener('beforeunload', () => {
  // Explicitly disconnect before page unload
  client.disconnect();
});

// Host handles disconnect
const host = createIframeHost(bus, {
  trustedOrigins: ['https://widget.example.com'],
  onIframeDisconnected: (iframe, reason) => {
    console.log(`Iframe disconnected: ${reason}`);
    
    if (reason === 'explicit_disconnect') {
      // Clean disconnect
    } else if (reason === 'removed_from_dom') {
      // Iframe removed
      analytics.track('widget_removed');
    }
  }
});
```

### Health Monitoring

```typescript
// Monitor iframe health
setInterval(() => {
  const stats = host.getStats();
  
  if (stats.connectedIframes < stats.totalIframes) {
    console.warn('Some iframes disconnected');
  }
  
  if (stats.messagesDropped > 0) {
    console.error('Messages being dropped');
  }
  
  // Send to analytics
  analytics.track('iframe_health', stats);
}, 30000);
```

---

## Security Best Practices

### Origin Validation

```typescript
// ✅ Good: Specific trusted origins
const host = createIframeHost({
  trustedOrigins: [
    'https://cart-widget.example.com',
    'https://chat-widget.example.com'
  ]
});

// ❌ Bad: Wildcard origins (don't do this)
// trustedOrigins: ['*']
```

### Content Security Policy

```html
<!-- Set CSP for iframe sandboxing -->
<meta http-equiv="Content-Security-Policy" 
      content="frame-src https://widgets.example.com;">
      
<iframe 
  src="https://widgets.example.com/cart"
  sandbox="allow-scripts allow-same-origin">
</iframe>
```

### Message Validation

```typescript
// Validate iframe messages
client.subscribe('cart.checkout', (message) => {
  const payload = message.payload;
  
  // Validate payload structure
  if (!payload.orderId || !payload.total) {
    console.error('Invalid checkout message');
    return;
  }
  
  processCheckout(payload);
});
```

---

## Performance Optimization

### Lazy Loading

```typescript
// Load iframes on demand
async function showWidget() {
  const iframe = await loadWidget('https://widgets.example.com/cart');
  await host.registerIframe(iframe, 'https://widgets.example.com');
  
  // Widget ready
  bus.publish('widget.loaded', { type: 'cart' });
}

document.querySelector('#show-cart').addEventListener('click', showWidget);
```

### Batching Messages

```typescript
// Batch multiple updates
const updates = [];

for (const item of cartItems) {
  updates.push({
    topic: 'cart.item.updated',
    payload: item
  });
}

// Send batch
for (const update of updates) {
  client.publish(update.topic, update.payload);
}
```

### Message Debouncing

```typescript
import { debounce } from 'lodash-es';

// Debounce frequent updates
const publishCartUpdate = debounce((cart) => {
  client.publish('cart.updated', cart);
}, 300);

// Called frequently
onCartChange((cart) => {
  publishCartUpdate(cart);
});
```

---

## Error Handling

### Host Error Handling

```typescript
const host = createIframeHost(bus, {
  trustedOrigins: ['https://widget.example.com'],
  onHandshakeFailed: (iframe, origin, error) => {
    console.error(`Handshake failed: ${origin}`, error);
    
    // Show error UI
    showWidgetError(iframe, 'Failed to connect');
    
    // Retry or fallback
    setTimeout(() => {
      host.registerIframe(iframe, origin);
    }, 5000);
  },
  onIframeDisconnected: (iframe, reason) => {
    if (reason === 'send_failed') {
      console.error('Communication error');
      // Show offline indicator
      showOfflineIndicator(iframe);
    }
  }
});
```

### Client Error Handling

```typescript
const client = createIframeClient(bus, {
  expectedHostOrigin: 'https://app.example.com',
  onDisconnected: (reason) => {
    console.error(`Disconnected: ${reason}`);
    
    // Show reconnecting UI
    showReconnecting();
    
    // Auto-reconnect
    if (reason !== 'explicit_disconnect') {
      setTimeout(() => {
        client.reconnect().then(() => {
          hideReconnecting();
        });
      }, 2000);
    }
  }
});

// Handle connection timeout
try {
  await client.connect();
} catch (error) {
  console.error('Connection failed:', error);
  showFallbackUI();
}
```

---

## Testing

### Host Testing

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import { createIframeHost } from '@belyas/pubsub-mfe/adapters/iframe';

describe('IframeHost', () => {
  let bus, host;
  
  beforeEach(() => {
    bus = createPubSub();
    host = createIframeHost(bus, {
      trustedOrigins: ['https://test.example.com']
    });
    host.attach(bus);
  });
  
  afterEach(() => {
    host.detach();
  });
  
  test('registers iframe', async () => {
    const iframe = createMockIframe('https://test.example.com');
    
    await host.registerIframe(iframe, 'https://test.example.com');
    
    const stats = host.getStats();
    expect(stats.connectedIframes).toBe(1);
  });
});
```

### Client Testing

```typescript
import { createIframeClient } from '@belyas/pubsub-mfe/adapters/iframe';

describe('IframeClient', () => {
  let client;
  
  beforeEach(() => {
    client = createIframeClient({
      expectedHostOrigin: 'https://test.example.com'
    });
  });
  
  test('subscribes to topics', async () => {
    await client.connect();
    
    const messages = [];
    client.subscribe('test.#', (message) => {
      messages.push(message);
    });
    
    // Simulate host message
    simulateHostMessage({
      topic: 'test.event',
      payload: { value: 123 }
    });
    
    expect(messages).toHaveLength(1);
  });
});
```

---

## Type Definitions

```typescript
interface IframeHost {
  attach(bus: PubSubBus): void;
  detach(): void;
  registerIframe(iframe: HTMLIFrameElement, origin: string): Promise<void>;
  unregisterIframe(iframe: HTMLIFrameElement): void;
  getStats(): IframeHostStats;
}

interface IframeClient {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  publish(topic: string, payload: unknown, options?: PublishOptions): void;
  subscribe(topic: string, handler: MessageHandler): () => void;
  isConnected(): boolean;
  getStats(): IframeClientStats;
}

interface PublishOptions {
  schemaVersion?: string;
}

type MessageHandler = (message: ReceivedMessage) => void;
```

---

## Browser Support

The Iframe adapter requires:

- ✅ **MessageChannel API** - Chrome 4+, Firefox 41+, Safari 5+, Edge 12+
- ✅ **postMessage API** - All modern browsers
- ✅ **MutationObserver** - Chrome 26+, Firefox 14+, Safari 6+, Edge 12+

**Feature Detection:**

```typescript
if (!window.MessageChannel) {
  console.error('MessageChannel not supported');
  // Use fallback communication method
}
```

---

## Next Steps

- **[Iframe Guide](/guide/adapters/iframe)** - Usage guide and patterns
- **[Cross-Tab API](/api/cross-tab)** - Cross-tab adapter
- **[History API](/api/history)** - History adapter
- **[Core API](/api/core)** - Core PubSub API

::: tip 💡 Security First
Always validate origins and use specific trusted origins instead of wildcards. The iframe adapter provides multiple security layers to ensure safe cross-origin communication.
:::
