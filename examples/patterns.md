# Advanced Patterns

Production-ready architectural patterns for building scalable microfrontend applications.

## Event Sourcing

Store all state changes as a sequence of events.

### Event Store

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import { createHistoryAdapter } from '@belyas/pubsub-mfe/adapters/history';

// Event store with long retention
const history = createHistoryAdapter({
  dbName: 'event-store',
  namespace: 'domain-events',
  ttlSeconds: 90 * 24 * 60 * 60, // 90 days
  maxMessages: 50000,
  gcIntervalMs: 60000, // GC runs every minute
  debug: false
});

const bus = createPubSub({ app: 'event-store' });
await history.attach(bus);

// Define domain events
interface OrderCreated {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}

interface OrderPaid {
  orderId: string;
  paymentMethod: string;
  amount: number;
}

interface OrderShipped {
  orderId: string;
  trackingNumber: string;
  carrier: string;
}

// Helper function to calculate total
function calculateTotal(items: Array<{ productId: string; quantity: number; price: number }>) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Publish events
function createOrder(order: Omit<OrderCreated, 'total'>) {
  const total = calculateTotal(order.items);
  bus.publish('domain.order.created', { ...order, total });
}

function payOrder(payment: OrderPaid) {
  bus.publish('domain.order.paid', payment);
}

function shipOrder(shipment: OrderShipped) {
  bus.publish('domain.order.shipped', shipment);
}

// Rebuild state from events
async function rebuildOrderState(orderId: string) {
  const events = await history.getHistory('domain.order.#', {
    limit: 1000
  });
  
  const orderEvents = events.filter(e => 
    e.topic.startsWith('domain.order.') &&
    e.payload.orderId === orderId
  );
  
  let state = {
    orderId,
    status: 'pending' as 'pending' | 'paid' | 'shipped',
    items: [] as Array<{ productId: string; quantity: number; price: number }>,
    total: 0,
    paymentMethod: null as string | null,
    trackingNumber: null as string | null
  };
  
  for (const event of orderEvents) {
    switch (event.topic) {
      case 'domain.order.created':
        state.items = event.payload.items;
        state.total = event.payload.total;
        break;
      case 'domain.order.paid':
        state.status = 'paid';
        state.paymentMethod = event.payload.paymentMethod;
        break;
      case 'domain.order.shipped':
        state.status = 'shipped';
        state.trackingNumber = event.payload.trackingNumber;
        break;
    }
  }
  
  return state;
}

// Time-travel debugging
async function getOrderStateAt(orderId: string, timestamp: number) {
  const events = await history.getHistory('domain.order.#', {
    fromTime: 0,
    limit: 10000
  });
  
  // Filter events up to that point in time and for this order
  const relevantEvents = events.filter(e => 
    e.ts <= timestamp &&
    e.payload.orderId === orderId
  );
  
  // Rebuild state up to that point
  // ... (similar to rebuildOrderState)
}
```

---

## CQRS (Command Query Responsibility Segregation)

Separate read and write operations for better scalability.

### Command Side (Write)

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

// Command bus for writes
const commandBus = createPubSub({ app: 'commands' });

// Event bus for domain events
const eventBus = createPubSub({ app: 'events' });

// Helper types
interface Order {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  createdAt: number;
}

interface CreateOrderCommand {
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}

interface UpdateOrderCommand {
  orderId: string;
  updates: Partial<Order>;
}

// Mock read model storage functions
async function updateReadModel(store: string, id: string, data: any) {
  // Implementation would use IndexedDB, localStorage, or remote API
  console.log(`Updating ${store}/${id}:`, data);
}

async function getFromReadModel(store: string, id: string) {
  // Implementation would fetch from storage
  return null;
}

// Helper function (from Event Sourcing section)
function calculateTotal(items: Array<{ productId: string; quantity: number; price: number }>) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Command handlers
commandBus.subscribe<CreateOrderCommand>(
  'commands.order.create',
  async (message) => {
    const { customerId, items } = message.payload;
    
    // Validate
    if (!items.length) {
      throw new Error('Order must have items');
    }
    
    // Create order
    const orderId = crypto.randomUUID();
    const total = calculateTotal(items);
    
    // Publish domain event
    eventBus.publish('domain.order.created', {
      orderId,
      customerId,
      items,
      total
    });
    
    // Update read model
    await updateReadModel('orders', orderId, {
      orderId,
      customerId,
      items,
      total,
      status: 'pending',
      createdAt: Date.now()
    });
  }
);

commandBus.subscribe<UpdateOrderCommand>(
  'commands.order.update',
  async (message) => {
    const { orderId, updates } = message.payload;
    
    // Validate
    const existing = await getFromReadModel('orders', orderId);
    if (!existing) {
      throw new Error('Order not found');
    }
    
    // Publish domain event
    eventBus.publish('domain.order.updated', {
      orderId,
      updates
    });
    
    // Update read model
    await updateReadModel('orders', orderId, updates);
  }
);

// Send commands
function sendCommand(command: string, payload: any) {
  commandBus.publish(command, payload);
}
```

### Query Side (Read)

```typescript
// Query bus for reads (separate from commands)
const queryBus = createPubSub({ app: 'queries' });

interface GetOrderQuery {
  orderId: string;
}

interface ListOrdersQuery {
  customerId?: string;
  status?: string;
  limit?: number;
}

// Mock query function
async function queryReadModel(store: string, filters: any) {
  // Implementation would query storage with filters
  return [];
}

// Query handlers (read from optimized read models)
queryBus.subscribe<GetOrderQuery>(
  'queries.order.get',
  async (message) => {
    const { orderId } = message.payload;
    const order = await getFromReadModel('orders', orderId);
    
    // Publish result back to event bus
    eventBus.publish(`queries.order.get.result.${orderId}`, order);
  }
);

queryBus.subscribe<ListOrdersQuery>(
  'queries.orders.list',
  async (message) => {
    const { customerId, status, limit = 50 } = message.payload;
    
    const orders = await queryReadModel('orders', {
      customerId,
      status,
      limit
    });
    
    // Publish result
    const correlationId = message.meta?.correlationId || message.id;
    eventBus.publish(`queries.orders.list.result.${correlationId}`, orders);
  }
);

// Execute queries
async function executeQuery<T>(query: string, payload: any): Promise<T> {
  return new Promise((resolve) => {
    const correlationId = crypto.randomUUID();
    
    // Subscribe to result on event bus
    const unsubscribe = eventBus.subscribe(
      `${query}.result.${correlationId}`,
      (message) => {
        resolve(message.payload);
        unsubscribe();
      }
    );
    
    // Publish query
    queryBus.publish(query, payload, { correlationId });
  });
}

// Usage
const order = await executeQuery<Order>('queries.order.get', {
  orderId: '123'
});

const orders = await executeQuery<Order[]>('queries.orders.list', {
  customerId: 'user-456',
  status: 'pending'
});
```

---

## Saga Pattern

Coordinate distributed transactions across microfrontends.

```typescript
import { createPubSub, type PubSubBus } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'saga' });

interface SagaStep {
  action: () => Promise<void>;
  compensation: () => Promise<void>;
}

class Saga {
  private bus: PubSubBus;
  private steps: SagaStep[] = [];
  private completedSteps: number = 0;
  
  constructor(bus: PubSubBus) {
    this.bus = bus;
  }
  
  addStep(step: SagaStep) {
    this.steps.push(step);
    return this;
  }
  
  async execute() {
    try {
      // Execute all steps
      for (let i = 0; i < this.steps.length; i++) {
        await this.steps[i].action();
        this.completedSteps = i + 1;
        
        this.bus.publish('saga.step.completed', {
          step: i + 1,
          total: this.steps.length
        });
      }
      
      this.bus.publish('saga.completed', {});
      return { success: true };
      
    } catch (error) {
      // Rollback completed steps
      this.bus.publish('saga.failed', { error: error.message });
      
      for (let i = this.completedSteps - 1; i >= 0; i--) {
        try {
          await this.steps[i].compensation();
          this.bus.publish('saga.step.compensated', {
            step: i + 1
          });
        } catch (compensationError) {
          this.bus.publish('saga.compensation.failed', {
            step: i + 1,
            error: compensationError.message
          });
        }
      }
      
      return { success: false, error };
    }
  }
}

// Example: Order checkout saga
async function checkoutSaga(orderId: string, customerId: string, paymentInfo: any) {
  const saga = new Saga(bus);
  
  let reservationId: string;
  let paymentId: string;
  
  // Mock helper functions
  async function reserveInventory(orderId: string): Promise<string> {
    return crypto.randomUUID();
  }
  
  async function releaseInventory(reservationId: string): Promise<void> {
    console.log('Released inventory:', reservationId);
  }
  
  async function processPayment(paymentInfo: any): Promise<string> {
    return crypto.randomUUID();
  }
  
  async function refundPayment(paymentId: string): Promise<void> {
    console.log('Refunded payment:', paymentId);
  }
  
  async function updateOrderStatus(orderId: string, status: string): Promise<void> {
    console.log('Updated order status:', orderId, status);
  }
  
  async function sendEmail(customerId: string, template: string, data: any): Promise<void> {
    console.log('Sent email:', customerId, template, data);
  }
  
  saga
    .addStep({
      // Reserve inventory
      action: async () => {
        reservationId = await reserveInventory(orderId);
        bus.publish('inventory.reserved', { orderId, reservationId });
      },
      compensation: async () => {
        await releaseInventory(reservationId);
        bus.publish('inventory.released', { orderId, reservationId });
      }
    })
    .addStep({
      // Process payment
      action: async () => {
        paymentId = await processPayment(paymentInfo);
        bus.publish('payment.processed', { orderId, paymentId });
      },
      compensation: async () => {
        await refundPayment(paymentId);
        bus.publish('payment.refunded', { orderId, paymentId });
      }
    })
    .addStep({
      // Update order status
      action: async () => {
        await updateOrderStatus(orderId, 'confirmed');
        bus.publish('order.confirmed', { orderId });
      },
      compensation: async () => {
        await updateOrderStatus(orderId, 'cancelled');
        bus.publish('order.cancelled', { orderId });
      }
    })
    .addStep({
      // Send confirmation email
      action: async () => {
        await sendEmail(customerId, 'order-confirmation', { orderId });
        bus.publish('email.sent', { orderId, type: 'confirmation' });
      },
      compensation: async () => {
        await sendEmail(customerId, 'order-cancellation', { orderId });
        bus.publish('email.sent', { orderId, type: 'cancellation' });
      }
    });
  
  return saga.execute();
}

// Usage
bus.subscribe('checkout.requested', async (message) => {
  const { orderId, customerId, paymentInfo } = message.payload;
  const result = await checkoutSaga(orderId, customerId, paymentInfo);
  
  if (result.success) {
    bus.publish('checkout.completed', { orderId });
  } else {
    bus.publish('checkout.failed', { orderId, error: result.error });
  }
});
```

---

## Aggregator Pattern

Combine data from multiple microfrontends.

```typescript
import { createPubSub, type PubSubBus } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'aggregator' });

interface AggregateQuery<T> {
  sources: string[];
  timeout?: number;
  partial?: boolean;
  transform?: (results: Map<string, any>) => T;
}

class Aggregator {
  private bus: PubSubBus;
  
  constructor(bus: PubSubBus) {
    this.bus = bus;
  }
  
  async aggregate<T>(query: AggregateQuery<T>): Promise<T> {
    const { sources, timeout = 5000, partial = false, transform } = query;
    const results = new Map<string, any>();
    const promises: Promise<void>[] = [];
    
    for (const source of sources) {
      const promise = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (!partial) {
            reject(new Error(`Timeout waiting for ${source}`));
          } else {
            resolve();
          }
        }, timeout);
        
        const unsubscribe = this.bus.subscribe(
          `aggregate.${source}.response`,
          (message) => {
            clearTimeout(timer);
            results.set(source, message.payload);
            unsubscribe();
            resolve();
          }
        );
        
        // Request data
        this.bus.publish(`aggregate.${source}.request`, {});
      });
      
      promises.push(promise);
    }
    
    await Promise.allSettled(promises);
    
    // Transform results
    if (transform) {
      return transform(results);
    }
    
    return Object.fromEntries(results) as T;
  }
}

// Example: Dashboard aggregation
interface DashboardData {
  orders: any[];
  inventory: any[];
  analytics: any;
}

const aggregator = new Aggregator(bus);

// Mock data fetchers
async function getRecentOrders() {
  return [{ orderId: '123', total: 100 }];
}

async function getInventoryStatus() {
  return [{ productId: 'ABC', stock: 50 }];
}

async function getAnalytics() {
  return { revenue: 10000, orders: 150 };
}

// MFEs respond to requests
bus.subscribe('aggregate.orders.request', async () => {
  const orders = await getRecentOrders();
  bus.publish('aggregate.orders.response', orders);
});

bus.subscribe('aggregate.inventory.request', async () => {
  const inventory = await getInventoryStatus();
  bus.publish('aggregate.inventory.response', inventory);
});

bus.subscribe('aggregate.analytics.request', async () => {
  const analytics = await getAnalytics();
  bus.publish('aggregate.analytics.response', analytics);
});

// Aggregate data for dashboard
async function loadDashboard() {
  const data = await aggregator.aggregate<DashboardData>({
    sources: ['orders', 'inventory', 'analytics'],
    timeout: 3000,
    partial: true, // Allow partial results
    transform: (results) => ({
      orders: results.get('orders') || [],
      inventory: results.get('inventory') || [],
      analytics: results.get('analytics') || {}
    })
  });
  
  return data;
}
```

---

## Request-Response Pattern

Implement synchronous-style communication.

```typescript
import { createPubSub, type PubSubBus } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'rpc' });

class RequestResponse {
  private bus: PubSubBus;
  private pending = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  
  constructor(bus: PubSubBus) {
    this.bus = bus;
    this.setupListeners();
  }
  
  private setupListeners() {
    this.bus.subscribe('rpc.response.#', (message) => {
      const parts = message.topic.split('.');
      const requestId = parts[parts.length - 1];
      const pending = this.pending.get(requestId);
      
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(requestId);
        
        if (message.payload.error) {
          pending.reject(new Error(message.payload.error));
        } else {
          pending.resolve(message.payload.result);
        }
      }
    });
  }
  
  async request<T>(method: string, params: any, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Request timeout: ${method}`));
      }, timeout);
      
      this.pending.set(requestId, { resolve, reject, timeout: timer });
      
      this.bus.publish(`rpc.request.${method}`, {
        requestId,
        params
      });
    });
  }
  
  handle(method: string, handler: (params: any) => Promise<any>) {
    this.bus.subscribe(`rpc.request.${method}`, async (message) => {
      const { requestId, params } = message.payload;
      
      try {
        const result = await handler(params);
        this.bus.publish(`rpc.response.${requestId}`, { result });
      } catch (error) {
        this.bus.publish(`rpc.response.${requestId}`, {
          error: error.message
        });
      }
    });
  }
}

// Setup
const rpc = new RequestResponse(bus);

// Mock helper functions
async function getOrder(orderId: string) {
  return { orderId, status: 'pending' };
}

// Register handlers
rpc.handle('calculateTotal', async (params) => {
  const { items } = params;
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

rpc.handle('validateOrder', async (params) => {
  const { orderId } = params;
  const order = await getOrder(orderId);
  return order.status === 'pending';
});

// Make requests
const total = await rpc.request<number>('calculateTotal', {
  items: [
    { price: 10, quantity: 2 },
    { price: 15, quantity: 1 }
  ]
});

const isValid = await rpc.request<boolean>('validateOrder', {
  orderId: '123'
});
```

---

## Circuit Breaker

Prevent cascading failures.

```typescript
import { createPubSub, type PubSubBus } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'circuit-breaker' });

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailTime = 0;
  private bus: PubSubBus;
  
  constructor(
    private name: string,
    private threshold: number,
    private timeout: number,
    bus: PubSubBus
  ) {
    this.bus = bus;
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.bus.publish('circuit.half-open', { name: this.name });
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.bus.publish('circuit.closed', { name: this.name });
    }
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.bus.publish('circuit.opened', { name: this.name });
    }
  }
}

// Usage
const inventoryBreaker = new CircuitBreaker('inventory', 5, 60000, bus);

// Mock cache function
function getCachedInventory(productId: string) {
  return { productId, stock: 0, cached: true };
}

async function getInventory(productId: string) {
  try {
    return await inventoryBreaker.execute(async () => {
      const response = await fetch(`/api/inventory/${productId}`);
      if (!response.ok) throw new Error('Inventory service error');
      return response.json();
    });
  } catch (error) {
    // Fallback to cached data
    return getCachedInventory(productId);
  }
}
```

---

## Next Steps

- **[Basic Examples](/examples/basic)** - Getting started
- **[Cross-Tab Examples](/examples/cross-tab)** - Multi-tab sync
- **[Core Concepts](/guide/core-concepts)** - Fundamentals
- **[API Reference](/api/core)** - Complete API

::: tip 💡 Production Tip
Combine patterns for robust systems:
```typescript
// CQRS + Event Sourcing + Saga
const commandBus = createPubSub({ app: 'commands' });
const queryBus = createPubSub({ app: 'queries' });
const eventBus = createPubSub({ app: 'events' });

const history = createHistoryAdapter({
  dbName: 'event-store',
  namespace: 'events',
  maxMessages: 10000,
  ttlSeconds: 30 * 24 * 60 * 60 // 30 days
});

await history.attach(eventBus);
```
:::
