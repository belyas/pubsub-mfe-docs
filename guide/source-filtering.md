# Source Filtering

Source filtering allows you to include or exclude messages based on their origin metadata. This is useful when multiple microfrontends share a bus but need to ignore their own publishes or messages from specific sources.

## Message Meta: `source`

Messages may include a `meta.source` property (string) which identifies the origin — for example a microfrontend name, component id, or runtime id.

```typescript
bus.publish('inventory.update', payload, {
  source: 'inventory-mfe',
});
```

## Excluding Own Messages

To avoid reacting to your own publishes (common in sync scenarios), use source filtering in the handler:
  > Be informed that, when publishing with source key as an option, there's an internal mechanism that goes through subscriptions and look into their sourceFilter key with include/exclude.

```typescript
const mySource = 'cart-mfe'

bus.subscribe('cart.#', (msg) => {
  if (msg.meta?.source === mySource) return; // ignore own events
  handleRemoteEvent(msg)
})

// publish including source
bus.publish('cart.item.add', { sku: 'X' }, {
  source: mySource,
});
```

## Adapter-level Filtering

Adapters (cross-tab, iframe) can optionally filter messages by source before forwarding to local subscribers. This reduces unnecessary local traffic.

## Filtering Strategies

- Whitelist by `meta.source` — accept only messages from trusted sources.
- Blacklist by `meta.source` — ignore messages from certain sources.
- Match by `meta` attributes (e.g., `correlationId`) for request-response flows.

## Security & Trust

Source metadata is only as trustworthy as the environment. In untrusted contexts (e.g., third-party iframes), do not rely solely on `meta.source` for authorization.

## Best Practices

- Set `meta.source` at the publishing boundary so all messages include origin metadata.
- Use adapter filtering to keep local buses clean.
- Combine source filtering with schema validation for robust ingest pipelines.

See also: [Adapters — Cross-Tab](/guide/adapters/cross-tab) and [Source Filtering in the API reference](/api/core).
