# Iframe Adapter

The Iframe adapter enables **secure bidirectional communication** between parent windows and child iframes, perfect for embedding microfrontends or third-party components.

## Overview

Safely communicate across iframe boundaries with:
- Origin validation
- Handshake protocol
- Automatic reconnection
- Schema validation
- Timeout handling

## Quick Start

### Parent (Host)

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import { createIframeHost, IframeHost } from '@belyas/pubsub-mfe/adapters/iframe';

const bus = createPubSub({ app: 'parent-app' });

// Create iframe element
const iframe = document.createElement('iframe');
iframe.src = 'https://child.example.com';
document.body.appendChild(iframe);

// Create host adapter
const host = createIframeHost(bus, {
  trustedOrigins: ['https://child.example.com'],
  handshakeTimeout: 5000,
  maxRetries: 2,
  autoReconnect: true,
});

// OR directly calling the iframe host class
const host = new IframeHost(config);
await host.attach(bus);

// Register child iframe
iframeHost.registerIframe(iframe, origin);

// Send message to iframe
bus.publish('parent.command', { action: 'update' });

// Receive from iframe
bus.subscribe('child.event', (msg) => {
  console.log('From iframe:', msg.payload);
});
```

### Child (Client)

```typescript
import { createIframeClient, IframeClient } from '@belyas/pubsub-mfe/adapters/iframe';

// Create client adapter
const client = createIframeClient({
  expectedHostOrigin: 'https://parent.example.com',
  handshakeTimeout: 5000
});

// OR call the class directly
const client = new IframeClient({
  expectedHostOrigin: "https://parent.example.com"
});

await client.connect();

// Send message to parent
client.publish('child.event', { data: 'hello' });

// Receive from parent
client.subscribe('parent.command', (msg) => {
  console.log('From parent:', msg.payload);
});
```

## Configuration

### Host Configuration

```typescript
interface IframeHostConfig {
  trustedOrigins: string[];           // Expected iframe origin
  handshakeTimeout?: number;          // Handshake timeout (default: 5000)
  maxRetries?: number;                // Maximum handshake retry attempts
  enforceSchemaValidation?: boolean;  // Enforce schema validation for messages from iframes
  autoReconnect?: boolean;            // Auto-reconnect on disconnect (default: true)
  debug?: boolean;                    // Enable debug logging
  onHandshakeComplete?: (iframe: HTMLIFrameElement, clientId: string) => void;
  onHandshakeFailed?: (iframe: HTMLIFrameElement, origin: string, error: Error) => void;
  onIframeDisconnected?: (iframe: HTMLIFrameElement, reason: DisconnectReason) => void;
  onValidationError?: (iframe: HTMLIFrameElement, topic: string, error: Error) => void;
}
```

### Client Configuration

```typescript
interface IframeClientConfig {
  expectedHostOrigin: string;    // Expected parent origin
  handshakeTimeout?: number;    // Handshake timeout (default: 5000)
  autoReconnect?: boolean;      // Auto-reconnect on disconnect (default: true)
  debug?: boolean;              // Enable debug logging
  onConnected?: (hostClientId: string) => void;
  onDisconnected?: (reason: DisconnectReason) => void;
}
```

## Security

### Origin Validation

Always validate origins to prevent XSS attacks:

```typescript
// ✅ Good: Specific origin
const host = createIframeHost({
  iframe,
  trustedOrigins: ['https://trusted.example.com]'
});

// ⚠️ Risky: Wildcard
const host = createIframeHost({
  iframe,
  trustedOrigins: ['*'  // Won't work for now, it need actual origi]n
});

// ✅ Better: Check origin in handler
bus.subscribe('child.#', (msg) => {
  if (msg.source !== 'trusted-iframe') {
    console.warn('Untrusted message:', msg);
    return;
  }
  processMessage(msg);
});
```

### Content Security Policy

Add CSP headers to restrict iframe sources:

```html
<meta http-equiv="Content-Security-Policy" 
      content="frame-src https://trusted.example.com;">
```

## Usage Patterns

### Parent-Child Communication

```typescript
// Parent: Command pattern
bus.publish('iframe.command.loadProduct', {
  productId: '123',
  variant: 'blue'
});

// Child: Event pattern
client.publish('iframe.event.productLoaded', {
  productId: '123',
  price: 29.99
});
```

### Data Synchronization

```typescript
// Parent: Sync user state
bus.subscribe('user.login', (msg) => {
  bus.publish('iframe.sync.user', {
    userId: msg.payload.userId,
    permissions: msg.payload.permissions
  });
});

// Child: Apply synced state
client.subscribe('iframe.sync.user', (msg) => {
  updateUserContext(msg.payload);
});
```

### Feature Embedding

```typescript
// Parent: Embed checkout in iframe
async function embedCheckout(items: CartItem[]) {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://checkout.example.com';
  
  document.body.appendChild(iframe);
  
  const host = createIframeHost({
    trustedOrigins: ['https://checkout.example.com']
  });
  
  await host.registerIframe(iframe, 'https://checkout.example.com');
  
  // Send cart data
  bus.publish('checkout.init', { items });
}

// Child: Handle checkout
client.subscribe('checkout.init', (msg) => {
  initCheckoutFlow(msg.payload.items);
});

client.subscribe('checkout.complete', (msg) => {
  // Notify parent
  client.publish('parent.checkout.success', msg.payload);
});
```

## Lifecycle Management

### Connection Status

```typescript
const host = createIframeHost({
  trustedOrigins: ['https://checkout.example.com'],
  onHandshakeComplete?: (iframe: HTMLIFrameElement, clientId: string) => {
    console.log('Handshake complete!');
    bus.publish('parent.ready', {});
  },
  onHandshakeFailed?: (iframe: HTMLIFrameElement, origin: string, error: Error) => {
    console.log('Handshake failed!');
  },
  onIframeDisconnected?: (iframe: HTMLIFrameElement, reason: DisconnectReason) => {
    console.log('Iframe disconnected');
    showReconnectingUI();
  },
  onValidationError?: (iframe: HTMLIFrameElement, topic: string, error: Error) => {
    console.log('Iframe validation error', topic, error);
  },
});
```

### Auto-Reconnection

```typescript
const host = createIframeHost({
  trustedOrigins: ['https://child.example.com'],
  autoReconnect: true  // Automatically retry handshake
});
```

### Cleanup

```typescript
// Detach adapter
await host.detach();

// Remove iframe
iframe.remove();
```

## Error Handling

```typescript
const host = createIframeHost({
  trustedOrigins: ['https://child.example.com'],
  handshakeTimeout: 5000,
  onHandshakeFailed?: (iframe: HTMLIFrameElement, origin: string, error: Error) => {
    console.log('Handshake failed!');
  },
  onValidationError?: (iframe: HTMLIFrameElement, topic: string, error: Error) => {
    console.log('Iframe validation error', topic, error);
  },
});
```

## Advanced Features

### Schema Validation

Validate messages with JSON Schema:

```typescript
// Parent: Validate child responses
bus.registerSchema('child-data-v1', {
  type: 'object',
  required: ['status', 'data'],
  properties: {
    status: { type: 'string' },
    data: { type: 'object' }
  }
});
bus.subscribe('child.data', (msg) => {
  // Validation handled by core bus
});
```

### Statistics

```typescript
const stats = await host.getStats();

console.log({
  connectedIframes: stats.connectedIframes,
  totalIframes: stats.totalIframes,
  connectedIframes: stats.connectedIframes,
  messagesSent: stats.messagesSent,
  handshakesFailed: stats.handshakesFailed,
  messagesDropped: stats.messagesDropped,
  validationErrors: stats.validationErrors,
});
```

## Best Practices

### 1. Always Validate Origins

```typescript
// ✅ Good
const host = createIframeHost({
  trustedOrigins: ['https://specific-domain.com']
});

// ❌ Bad: Wildcard in production
const host = createIframeHost({
  trustedOrigins: ['*']
});
```

### 2. Implement Timeouts

```typescript
const host = createIframeHost({
  trustedOrigins: ['https://child.example.com'],
  handshakeTimeout: 5000,  // Fail fast
  onHandshakeFailed: (iframe: HTMLIFrameElement, origin: string, error: Error) => {
    if (error.message.includes('timeout')) {
      showErrorUI('Iframe failed to load');
    }
  },
});
```

### 3. Namespace Topics

```typescript
// ✅ Good: Clear iframe-specific topics
bus.publish('iframe.child1.command', {});
bus.subscribe('iframe.child1.event', handler);

// ❌ Bad: Generic topics
bus.publish('update', {});
```

### 4. Clean Up Resources

```typescript
// React example
useEffect(() => {
  const iframe = createIframe();
  const host = createIframeHost({ trustedOrigins });
  
  // ...

  return () => {
    host.detach();
    iframe.remove();
  };
}, []);
```

## Troubleshooting

### Handshake Timeout

```typescript
// Increase timeout
const host = createIframeHost({
  trustedOrigins: ['https://child.example.com'],
  handshakeTimeout: 10000  // 10 seconds
});
```

### Origin Mismatch

```typescript
// Check iframe src matches trustedOrigins
iframe.src = 'https://child.example.com';  // Must matc]h
const host = createIframeHost({
  trustedOrigins: ['https://child.example.com']  // Must matc]h
});
```

### Messages Not Received

```typescript
// Enable debug logging
const host = createIframeHost({
  trustedOrigins: ['https://child.example.com'],
  debug: true  // Shows all postMessage traffic
});
```

## Browser Support

- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Edge: ✅ Full support

postMessage API is universally supported.

## Next Steps

- **[API Reference](/api/iframe)** - Complete iframe API
- **[Examples](/examples/iframe)** - Real-world patterns
- **[Security Best Practices](/guide/advanced/best-practices)** - Production security

::: warning 🔒 Security Warning
Always validate iframe origins. Never use `trustedOrigins: ['*']`. Validate all data received from iframes.
:::
