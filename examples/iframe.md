# Iframe Bridge

Use the Iframe adapter to enable secure, structured communication between a host page and embedded iframes. The adapter uses MessageChannel for secure, isolated communication with a three-way handshake (SYN → ACK → ACK_CONFIRM).

## Host (parent) side

```typescript
// parent.ts
import { createPubSub } from '@belyas/pubsub-mfe';
import { createIframeHost } from '@belyas/pubsub-mfe/adapters/iframe';

const bus = createPubSub({ app: 'parent' });

// Create and attach the iframe host adapter
const iframeHost = createIframeHost(bus, {
  trustedOrigins: ['https://embed.example.com'],
  autoReconnect: true,
  debug: false,
  onHandshakeComplete: (iframe, clientId) => {
    console.log('Iframe connected:', clientId)
  },
  onIframeDisconnected: (iframe, reason) => {
    console.log('Iframe disconnected:', reason)
  }
});

// Register an iframe for communication
const iframe = document.querySelector('iframe');
await iframeHost.registerIframe(iframe, 'https://embed.example.com');

// Publish messages to the bus - they'll be broadcast to all connected iframes
bus.publish('iframe.modal.open', { modalId: 'settings' });

// Subscribe to messages from iframes
bus.subscribe('iframe.action.#', (msg) => {
  console.log('Action from iframe:', msg.topic, msg.payload)
});
```

## Client (iframe) side

```typescript
// iframe.ts
import { createIframeClient } from '@belyas/pubsub-mfe/adapters/iframe';

// Create and connect the iframe client
const client = await createIframeClient({
  expectedHostOrigin: 'https://parent.example.com',
  autoReconnect: true,
  debug: false,
  onConnected: (hostClientId) => {
    console.log('Connected to host:', hostClientId)
  },
  onDisconnected: (reason) => {
    console.log('Disconnected from host:', reason)
  }
});

// Subscribe to messages from host
client.subscribe('iframe.modal.#', (message) => {
  console.log('Modal command:', message.topic, message.payload)
  openModalUI(message.payload.modalId)
});

// Publish messages to host
client.publish('iframe.action.click', { 
  button: 'save',
  timestamp: Date.now() 
});

// Explicit disconnect when needed
// client.disconnect()
```

## Handshake & Security

- **Three-way handshake**: SYN (host → iframe) → ACK (iframe → host) → ACK_CONFIRM (host → iframe with MessagePort)
- **Origin validation**: Host validates `trustedOrigins`, client validates `expectedHostOrigin`
- **MessageChannel**: Dedicated MessagePort per iframe for secure, isolated communication
- **Echo filtering**: Client automatically filters out messages it sent to prevent echoes
- **Auto-reconnect**: Both host and client support automatic reconnection on iframe reload or connection loss

## Disconnect Detection

The adapter handles three types of disconnects:

1. **Passive**: Host detects when iframe is removed from DOM via MutationObserver
2. **Active**: MessagePort communication fails (network/browser issues)
3. **Explicit**: Either side calls `disconnect()` for graceful shutdown

## Configuration Options

### IframeHostConfig

- `trustedOrigins`: Array of allowed iframe origins
- `handshakeTimeout`: Timeout for handshake completion (default: 5000ms)
- `maxRetries`: Maximum handshake retry attempts (default: 2)
- `autoReconnect`: Auto-reconnect on iframe reload (default: true)
- `enforceSchemaValidation`: Enforce schema validation for iframe messages (default: false)
- `debug`: Enable debug logging (default: false)

### IframeClientConfig

- `expectedHostOrigin`: Expected origin of the host application
- `handshakeTimeout`: Timeout for handshake completion (default: 5000ms)
- `autoReconnect`: Auto-reconnect if disconnected (default: true)
- `debug`: Enable debug logging (default: false)

## Best Practices

- Always specify exact origins (avoid wildcards like `*`)
- Use `enforceSchemaValidation` on the host for strict message validation
- Check `message.source` to identify the sender
- Handle `onDisconnected` callbacks for cleanup logic
- Use `autoReconnect` for resilient iframe communication

See also: [Adapters — Iframe](/guide/adapters/iframe) and [Source Filtering](/guide/source-filtering).
