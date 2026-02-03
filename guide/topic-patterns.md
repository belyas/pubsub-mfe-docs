# Topic Patterns

Master wildcard topic patterns for flexible message routing.

## Pattern Syntax

PubSub MFE uses **MQTT-style topic patterns** with dot-separated segments and two types of wildcards:

| Wildcard | Name | Matches | Position |
|----------|------|---------|----------|
| `+` | Single-level | One segment | Any segment |
| `#` | Multi-level | Zero or more segments | Last segment only |

## Basic Patterns

### Exact Match

```typescript
// Pattern: 'cart.item.add'
bus.subscribe('cart.item.add', handler);

// ✅ Matches
'cart.item.add'

// ❌ Doesn't match
'cart.item.remove'
'cart.item.add.confirm'
'user.cart.item.add'
```

### Single-Level Wildcard (`+`)

Matches **exactly one** segment at the wildcard position:

```typescript
// Pattern: 'cart.+.add'
bus.subscribe('cart.+.add', handler);

// ✅ Matches
'cart.item.add'
'cart.promo.add'
'cart.coupon.add'

// ❌ Doesn't match
'cart.add'              // Too few segments
'cart.item.detail.add'  // Too many segments
'order.item.add'        // Wrong first segment
```

### Multi-Level Wildcard (`#`)

Matches **zero or more** segments from the wildcard position to the end:

```typescript
// Pattern: 'cart.#'
bus.subscribe('cart.#', handler);

// ✅ Matches (all of these!)
'cart'                    // Zero segments after 'cart'
'cart.item'
'cart.item.add'
'cart.item.detail.view'
'cart.checkout.payment.complete'

// ❌ Doesn't match
'user.cart'              // Doesn't start with 'cart'
'order.complete'         // Wrong domain
```

### Global Wildcard

Match **all** topics:

```typescript
// Pattern: '#'
bus.subscribe('#', handler);

// ✅ Matches everything
'cart.item.add'
'user.login'
'analytics.page.view'
// ... any topic
```

## Pattern Examples

### E-Commerce Use Cases

```typescript
// All cart operations
bus.subscribe('cart.#', handler);
// Matches: cart.item.add, cart.checkout.start, cart.coupon.apply

// Any entity 'add' action
bus.subscribe('cart.+.add', handler);
// Matches: cart.item.add, cart.promo.add, cart.coupon.add

// All user events
bus.subscribe('user.#', handler);
// Matches: user.login, user.logout, user.profile.update

// All 'update' actions across domains
bus.subscribe('*.*.update', handler); // ❌ Invalid! Use multiple subscriptions instead
// Instead, do:
bus.subscribe('user.profile.update', handler);
bus.subscribe('cart.item.update', handler);
bus.subscribe('order.status.update', handler);
```

### Event Logging

```typescript
// Log all events to analytics
bus.subscribe('#', (msg) => {
  analytics.track(msg.topic, {
    payload: msg.payload,
    origin: msg.meta.source,
    timestamp: msg.ts
  });
});

// Log only critical domain events
bus.subscribe('payment.#', (msg) => {
  criticalLogger.log(msg);
});
bus.subscribe('order.#', (msg) => {
  criticalLogger.log(msg);
});
```

### Feature Flags

```typescript
// Listen to all feature flag changes
bus.subscribe('feature.+.changed', (msg) => {
  const featureName = msg.topic.split('.')[1];
  const enabled = msg.payload.enabled;
  updateFeatureState(featureName, enabled);
});

// Publish feature changes
bus.publish('feature.darkMode.changed', { enabled: true });
bus.publish('feature.newCheckout.changed', { enabled: false });
```

## Pattern Matching Rules

### Validation

Topics and patterns must follow these rules:

```typescript
// ✅ Valid patterns
'cart.item.add'          // Exact topic
'cart.+.add'             // Single wildcard
'cart.#'                 // Multi wildcard
'user.profile.+'         // Wildcard at end
'#'                      // Global

// ❌ Invalid patterns
'cart..item'             // Empty segment
'cart.#.item'            // # not at end
'cart.ite+m.add'         // + not complete segment
'cart.item.'             // Trailing dot
'.cart.item'             // Leading dot
```

### Specificity

More specific patterns match before general ones:

```typescript
// Order of pattern specificity (most → least specific):
1. 'cart.item.add'              // Exact
2. 'cart.item.+'                // Single wildcard
3. 'cart.+.add'                 // Single wildcard (different position)
4. 'cart.#'                     // Multi wildcard
5. '#'                          // Global

// All these handlers will fire for 'cart.item.add':
bus.subscribe('cart.item.add', handler1);
bus.subscribe('cart.item.+', handler2);
bus.subscribe('cart.+.add', handler3);
bus.subscribe('cart.#', handler4);
bus.subscribe('#', handler5);
```

::: tip 💡 Handler Order
Handlers are called in **subscription order**, not pattern specificity. All matching handlers receive the message.
:::

## Performance Considerations

### Pattern Complexity

Different patterns have different performance characteristics:

| Pattern Type | Matching Speed | Use Case |
|--------------|----------------|----------|
| Exact | ⚡ Fastest | Known, specific topics |
| Single wildcard | 🚀 Fast | Category-based routing |
| Multi wildcard | 🐌 Slower | Broad monitoring |
| Global | 🐌 Slowest | Debug/analytics only |

### Best Practices

```typescript
// ✅ Good: Specific patterns
bus.subscribe('cart.item.add', handler);
bus.subscribe('user.profile.update', handler);

// ⚠️ Use sparingly: Broad patterns
bus.subscribe('cart.#', handler);        // OK for cart domain monitoring
bus.subscribe('#', handler);             // Use only for analytics/logging

// ❌ Avoid: Multiple broad patterns
bus.subscribe('#', handler1);
bus.subscribe('#', handler2);
bus.subscribe('#', handler3);
// Too much overhead! Each handler runs for EVERY message
```

### Optimization Tips

```typescript
// Instead of multiple global subscriptions:
bus.subscribe('#', (msg) => {
  handler1(msg);
  handler2(msg);
  handler3(msg);
});

// Use specific patterns when possible:
bus.subscribe('cart.#', cartHandler);
bus.subscribe('user.#', userHandler);
bus.subscribe('order.#', orderHandler);
```

## Pattern Testing

Test your patterns before deployment:

```typescript
import { compileMatcher, matchTopic } from '@belyas/pubsub-mfe';

// Test if pattern matches topic
console.log(matchTopic(compileMatcher('cart.+.add'), 'cart.item.add'));      // true
console.log(matchTopic(compileMatcher('cart.+.add'), 'cart.item.remove'));   // false
console.log(matchTopic(compileMatcher('cart.#'), 'cart.item.add'));          // true
console.log(matchTopic(compileMatcher('cart.#'), 'user.login'));             // false
```

## Common Patterns

### Domain-Based Organization

```typescript
// User domain
'user.login'
'user.logout'
'user.profile.update'
'user.preferences.changed'

// Cart domain
'cart.item.add'
'cart.item.remove'
'cart.item.update'
'cart.checkout.start'

// Order domain
'order.created'
'order.status.changed'
'order.payment.processed'
'order.shipped'
```

### Action-Based Organization

```typescript
// Create actions
'user.created'
'order.created'
'product.created'

// Update actions
'user.profile.updated'
'order.status.updated'
'product.inventory.updated'

// Delete actions
'user.deleted'
'order.cancelled'
'product.discontinued'
```

### Event Sourcing Pattern

```typescript
// Command pattern
'command.cart.addItem'
'command.order.create'
'command.payment.process'

// Event pattern
'event.cart.itemAdded'
'event.order.created'
'event.payment.processed'

// Aggregate root pattern
'aggregate.user.123.profileUpdated'
'aggregate.order.456.statusChanged'
```

## Next Steps

- **[Publishing & Subscribing](/guide/pub-sub)** - Complete pub/sub guide
- **[Source Filtering](/guide/source-filtering)** - Filter by message origin
- **[API Reference](/api/core)** - Complete API documentation
- **[Examples](/examples/basic)** - Real-world pattern examples

## Interactive Topic Pattern 

<div style="text-align: center; margin: 40px 0;">
  <iframe src="/pubsub-mfe-docs/pattern-playground/index.html" width="100%" height="420" style="border:1px solid #e5e7eb;border-radius:8px;" sandbox="allow-scripts allow-same-origin"></iframe>
  <p style="color: #666; font-style: italic; margin-top: 12px;">Test your patterns interactively</p>
</div>
