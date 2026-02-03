# Schema Validation

PubSub MFE can integrate with JSON Schema (or other validators) to validate message payloads at publish time or on receipt. This helps maintain compatibility and detect malformed messages early.

## Registering Schema Before Publishing

```typescript
const cardItemSchemaVersion = 'cart.item@1';

bus.registerSchema(cardItemSchemaVersion, {
  type: 'object',
  properties: {
    sku: { type: 'string', minLength: 1 },
    name: { type: 'string' },
    qty: { type: 'number', minimum: 1 },
    price: { type: 'number', minimum: 0 },
  },
  required: ['sku', 'qty'],
  additionalProperties: false,
});

bus.publish('cart.item.add', payload, {
  schemaVersion: cardItemSchemaVersion,
});
```

## Validate on the Subscriber

If you prefer to accept any messages but validate on handlers:

```typescript
bus.subscribe('cart.item.+', (msg) => {
  if (msg.schemaVersion && !hasSchema(msg.schemaVersion)) {
    console.warn('Schema not found', msg.id);
    return;
  }

  if (
    msg.schemaVersion 
    && validateAgainstVersion(msg.payload, msg.schemaVersion)
  ) {
    console.warn('Dropped invalid message', msg.id);
    return;
  }
  // safe to handle
})
```

## Versioning & Migration

- Use `schemaVersion` in the message envelope to track format changes.
- Keep migration handlers that can upgrade older payloads to new formats before processing.

## Performance Considerations

- Schema validation costs CPU — validate only when needed.
- Consider validating only at system boundaries (publish or entry adapters), not every internal handler.

## Example: Adapter-level Validation

If you control an adapter (e.g., history adapter), validate messages as they are replayed from storage before publishing to live subscribers.

See also: [Types](/api/types) and [Best Practices](/guide/advanced/best-practices).
