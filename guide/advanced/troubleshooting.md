# Troubleshooting

This page lists common issues and how to diagnose/fix them when using PubSub MFE.

## 1. Messages Not Arriving in Other Tabs

Possible causes:
- Transport not attached or failed to connect.
- Channel name mismatch between tabs.
- Browser does not support the preferred transport and fallback isn't configured.

Diagnostics:
- Check adapter `getStats()` if available.
- Verify the `channelName` is identical across contexts.
- Open DevTools and look for transport errors.

Fixes:
- Ensure the adapter is attached with `await adapter.attach(bus)`.
- Use `createAutoTransport()` to fall back to supported transports.

## 2. Duplicate Messages

Possible causes:
- Multiple transports delivering the same message without deduplication.
- Replay from history adapter combined with live delivery.

Diagnostics:
- Check `message.id` and compare duplicates.
- Enable deduplication in the adapter configuration.

Fixes:
- Enable adapter-level deduplication (deduplication cache and window).
- Filter replays by timestamp or use `schemaVersion` to detect replayed formats.

## 3. Slow Delivery / High Latency

Possible causes:
- Batching interval too long.
- Heavy synchronous handlers blocking the event loop.
- Transport fallback to slower mechanisms (localStorage polling).

Diagnostics:
- Measure latency using `ping` messages (see Performance guide).
- Check handler runtimes and move heavy work off the main thread.

Fixes:
- Reduce `batchIntervalMs` or disable batching for low-latency needs.
- Move heavy computation to Web Workers or backend services.
- Prefer `BroadcastChannel` or `SharedWorker` transports instead of polling.

## 4. Schema Validation Failures

Possible causes:
- Schema mismatch between publisher and subscriber.
- Missing `schemaVersion` or incorrect payload shape.

Diagnostics:
- Log failing validation errors with the message `id` and `topic`.
- Compare `schemaVersion` values.

Fixes:
- Add migration handlers to upgrade older schema versions.
- Validate at publish-time and reject malformed messages.

## 5. Cross-Origin Frame Communication Issues

Possible causes:
- postMessage origin restrictions.
- iframe not granting required permissions.

Diagnostics:
- Check browser console for security errors.
- Inspect `postMessage` event origins.

Fixes:
- Use explicit `targetOrigin` in `postMessage` where possible.
- Implement an initial handshake between host and iframe to agree on channel names and allowed sources.

## When to File an Issue

If you encounter a reproducible bug that you cannot fix, please open an issue with:
- Minimal reproduction steps
- Environment details (browser, version)
- Adapter/transport configuration sample
- Relevant logs or stack traces

See also: [Best Practices](/guide/advanced/best-practices) and [Performance Benchmarks](/guide/advanced/performance).
