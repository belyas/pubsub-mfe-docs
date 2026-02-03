---
layout: home

hero:
  name: "PubSub MFE"
  text: "Browser-native Pub/Sub for Microfrontends"
  tagline: Zero dependencies, MQTT-style wildcards, production-ready
  image:
    src: /logo.svg
    alt: PubSub MFE
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/belyas/pubsub-mfe

features:
  - icon: 🚀
    title: Zero Dependencies
    details: No external libraries. Tree-shakable bundles with optimal size. Uses only native browser APIs.
  
  - icon: 🎯
    title: MQTT-style Wildcards
    details: Flexible topic patterns with "+" (single-level) and "#" (multi-level) wildcards for powerful message routing.
  
  - icon: 🛡️
    title: Handler Isolation
    details: Bulkhead pattern prevents cascading failures. One handler error doesn't affect others.
  
  - icon: 🔄
    title: Cross-Tab Sync
    details: Multiple transports (BroadcastChannel, SharedWorker, Storage) for seamless cross-tab communication.
  
  - icon: 📜
    title: History & Replay
    details: IndexedDB-based message history with TTL, retention policies, and efficient garbage collection.
  
  - icon: 🌐
    title: Iframe Bridge
    details: Secure parent-child iframe communication with origin validation and bidirectional messaging.
  
  - icon: ✅
    title: Schema Validation
    details: Optional JSON Schema validation with strict/warn modes for message contract enforcement.
  
  - icon: 📘
    title: TypeScript-First
    details: Full type safety with branded types, comprehensive generics, and excellent IDE support.
  
  - icon: 🎛️
    title: Lifecycle-Aware
    details: AbortSignal support for automatic cleanup and integration with modern React/Vue... patterns.
---


## Quick Example

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

// Create a bus instance
const bus = createPubSub({ app: 'my-app' });

// Subscribe with wildcards
bus.subscribe('cart.#', (msg) => {
  console.log('Cart event:', msg.topic, msg.payload);
});

// Publish messages
bus.publish('cart.item.add', { sku: 'ABC123', qty: 1 });
bus.publish('cart.checkout', { total: 99.99 });
```

## Why PubSub MFE?

Built specifically for **microfrontend architectures**, PubSub MFE solves common communication challenges:

- **Decoupled Communication**: Teams work independently without tight coupling
- **Event-Driven Architecture**: Build reactive, scalable applications
- **Cross-Tab Coordination**: Keep multiple tabs/windows synchronized
- **Historical Context**: New components can catch up with past events
- **Production-Ready**: Battle-tested with comprehensive error handling

## Architecture Overview

<div style="text-align: center; margin: 40px 0;">
  <img src="/architecture_overview.png" alt="PubSub MFE Architecture Diagram - Shows core bus with adapters for cross-tab, history, and iframe communication" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
  <p style="color: #666; font-style: italic; margin-top: 12px;">Architecture: Core bus with pluggable adapters</p>
</div>

## What's Next?

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">New to PubSub MFE?</p>
    <p>Start with the <a href="guide/getting-started">Getting Started Guide</a> to learn the basics.</p>
  </div>

  <div class="custom-block info">
    <p class="custom-block-title">Looking for specific features?</p>
    <p>Check out the <a href="guide/core-concepts">Core Concepts</a> to understand the architecture.</p>
  </div>

  <div class="custom-block warning">
    <p class="custom-block-title">Migrating from another solution?</p>
    <p>See <a href="guide/advanced/best-practices">Best Practices</a> for migration patterns.</p>
  </div>
</div>
