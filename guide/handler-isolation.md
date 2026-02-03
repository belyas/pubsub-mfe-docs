# Handler Isolation

One of PubSub MFE's core goals is to ensure that errors or slow handlers do not compromise the rest of the system. This page explains how handler isolation works and how to write resilient subscribers.

## What is Handler Isolation?

Handler isolation ensures that exceptions thrown by one subscriber do not prevent the bus from delivering a message to other subscribers. Each handler is invoked within a safe execution context.

## Error Handling

- Exceptions thrown by a handler are caught by the bus and surfaced via diagnostics (if enabled) or logged to the console in development.
- A failed handler does not interrupt delivery to other handlers.

```typescript
bus.subscribe('orders.process', (msg) => {
  try {
    processOrder(msg.payload)
  } catch (err) {
    // local handler-level handling
    reportError(err, { topic: msg.topic })
  }
})
```

## Timeouts & Long-Running Handlers

By design, handlers are executed synchronously for local delivery. If your handler can be long-running, consider:

- Offloading work to a microtask or worker:

```typescript
bus.subscribe('reports.generate', (msg) => {
  // keep local delivery fast
  setTimeout(() => {
    heavyReportGeneration(msg.payload)
  }, 0)
})
```

- Using promises and returning them if your adapter supports async handling.

## Isolation Patterns

- Defensive coding: wrap sensitive logic in try/catch.
- Use `AbortSignal` to cancel long-running subscriptions when components unmount.
- Keep handlers focused and small — prefer delegating to services.

## Diagnostics & Observability

Enable diagnostics via subscribing to the internal `bus.onDiagnostic` (if present) to collect handler exceptions, delivery times, and ordering.

## Best Practices

- Do not mutate the incoming message payload directly — treat messages as immutable.
- Avoid blocking the main thread in handlers. Move heavy CPU work to Web Workers or backend services.

See also: [Performance](/guide/advanced/performance) and [Topic Patterns](/guide/topic-patterns).
