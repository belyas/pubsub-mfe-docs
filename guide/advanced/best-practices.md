# Best Practices

This page collects practical recommendations for using PubSub MFE safely and efficiently in production.

## Topic Naming

- Use domain-oriented names: `domain.entity.action` (e.g., `cart.item.add`).
- Avoid deeply nested topics unless necessary.
- Reserve a small set of global topics (e.g., `#`) for cross-cutting concerns like telemetry.

## Subscription Management

- Use `AbortSignal` for lifecycle-managed subscriptions in UI frameworks.
- Prefer single wildcard subscriptions (`cart.#`) instead of many specific subscriptions.
- Provide `context` when subscribing to ease debugging.

## Payload Design

- Keep payloads small — send IDs and small deltas instead of large objects.
- Use stable schemas and include `schemaVersion` in the message envelope.
- Consider storing large blobs in IndexedDB and passing references in messages.

## Adapter & Transport Use

- Let adapters handle cross-tab/iframe transport specifics — don't reimplement transport logic in application code.
- Use `Auto` transports for broad browser compatibility.
- Configure batching and deduplication on adapters for high-throughput scenarios.

## Error Handling

- Wrap handler logic with try/catch and report errors to a centralized error collector.
- Avoid mutating incoming message objects — treat them as immutable snapshots.

## Security

- Validate messages at boundaries using JSON Schema or runtime checks.
- Do not trust `meta.source` in untrusted environments—combine with origin checks.
- Limit the use of `#` (global subscriptions) in public-facing bundles.

## Testing & Observability

- Add an integration test that simulates multiple tabs using the cross-tab adapter.
- Use a lightweight telemetry listener during development to measure throughput and handler latencies.
- Expose adapter statistics (where available) to monitor transport health.

See also: [Performance Benchmarks](/guide/advanced/performance) and [Transports](/guide/advanced/transports).
