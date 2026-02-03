# Publishing & Subscribing

This page covers the basic publish/subscribe primitives in PubSub MFE: how to publish messages, subscribe to topics, and manage subscription lifetimes.

## Publish

Use `bus.publish(topic, payload, options?)` to send a message through the bus. The bus will wrap the payload into a standard message envelope which includes metadata (`id`, `ts`, `topic`, `payload`,  `meta`, ...).

```typescript
// TypeScript
bus.publish('cart.item.add', { sku: 'ABC123', qty: 1 })

// Add optional meta
bus.publish('user.login', { userId: 'u-1' }, { meta: { source: 'auth' } })
```

Notes:
- Publishing is synchronous from the caller's perspective (message is enqueued and dispatched to local subscribers). Delivery to remote transports (cross-tab) may be asynchronous depending on configured transports.
- You can provide `meta` and `schemaVersion` in options to help with tracing and validation.

## Subscribe

Subscribe with `bus.subscribe(topicPattern, handler, opts?)`. Subscriptions return an `unsubscribe` function.

```typescript
const unsubscribe = bus.subscribe('cart.item.+', (msg) => {
  console.log('Item event:', msg.topic, msg.payload)
})

// Remove when no longer needed
unsubscribe()
```

Options:
- `signal?: AbortSignal` — remove the subscription when the signal is aborted.
- `replay?: number` — replay last N messages on subscribe.
- `sourceFilter?: object` — Source filter — only receive messages from specific sources.

## One-time & Scoped Subscriptions

For short-lived listeners you can either call the returned `unsubscribe()` or use an `AbortSignal`:

```typescript
const controller = new AbortController()

bus.subscribe('orders.#', handler, { signal: controller.signal })

// later
controller.abort() // removes all subscriptions created with this signal
```

## Delivery Guarantees

PubSub MFE is designed to be lightweight and predictable:
- Local subscribers are invoked asynchronously in publish order (subject to handler isolation).
- Cross-tab or transport-delivered subscribers may receive messages asynchronously.
- There are no built-in guaranteed retries; if you need retries, implement them in your handler or using an intermediate adapter.

## Best Practices

- Keep payloads small and focused (IDs + minimal data). Use a shared storage (IndexedDB) for large blobs.
- Use domain-oriented topic naming: `domain.entity.action` (e.g., `cart.item.add`).
- Use `AbortSignal` for lifecycle-managed subscriptions in frameworks.

See also: [Topic Patterns](/guide/topic-patterns) and [Handler Isolation](/guide/handler-isolation).
