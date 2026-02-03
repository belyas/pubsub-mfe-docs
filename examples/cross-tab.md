# Cross-Tab Examples

Practical examples demonstrating cross-tab synchronization in real-world scenarios.

## Multi-Tab Shopping Cart

Synchronize shopping cart state across multiple tabs.

### Setup

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';
import { createCrossTabAdapter } from '@belyas/pubsub-mfe/adapters/cross-tab';

const bus = createPubSub();
const crossTab = createCrossTabAdapter({
  channelName: 'shop-cart-v1'
});

crossTab.attach(bus);
```

### Cart State Management

```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Cart {
  items: CartItem[];
  total: number;
}

// Local cart state
let cart: Cart = { items: [], total: 0 };

// Subscribe to cart updates from other tabs
bus.subscribe<CartItem>('cart.item.added', (message) => {
  const item = message.payload;
  const existing = cart.items.find(i => i.id === item.id);
  
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.items.push({ ...item });
  }
  
  updateCartTotal();
  renderCart();
});

bus.subscribe<{ itemId: string }>('cart.item.removed', (message) => {
  const { itemId } = message.payload;
  cart.items = cart.items.filter(i => i.id !== itemId);
  updateCartTotal();
  renderCart();
});

bus.subscribe('cart.cleared', () => {
  cart.items = [];
  cart.total = 0;
  renderCart();
});

// Publish cart actions
function addToCart(item: CartItem) {
  bus.publish('cart.item.added', item);
}

function removeFromCart(itemId: string) {
  bus.publish('cart.item.removed', { itemId });
}

function clearCart() {
  bus.publish('cart.cleared', {});
}

function updateCartTotal() {
  cart.total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}
```

### UI Integration

```typescript
// Add to cart button handler
document.querySelectorAll('.add-to-cart').forEach(button => {
  button.addEventListener('click', (e) => {
    const productElement = e.target.closest('.product');
    const item: CartItem = {
      id: productElement.dataset.id,
      name: productElement.dataset.name,
      price: parseFloat(productElement.dataset.price),
      quantity: 1
    };
    
    addToCart(item);
  });
});

// Render cart in all tabs
function renderCart() {
  const cartElement = document.getElementById('cart');
  cartElement.innerHTML = `
    <h3>Cart (${cart.items.length} items)</h3>
    <ul>
      ${cart.items.map(item => `
        <li>
          ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
          <button onclick="removeFromCart('${item.id}')">Remove</button>
        </li>
      `).join('')}
    </ul>
    <p><strong>Total: $${cart.total.toFixed(2)}</strong></p>
    ${cart.items.length > 0 ? 
      '<button onclick="clearCart()">Clear Cart</button>' : 
      '<p>Cart is empty</p>'
    }
  `;
}
```

**Result:** Cart stays synchronized across all open tabs. Adding/removing items in one tab instantly reflects in all other tabs.

---

## Real-Time Authentication

Synchronize login/logout across tabs for better UX.

### Auth Manager

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

class AuthManager {
  private currentUser: User | null = null;
  private bus: PubSubBus;
  
  constructor(bus: PubSubBus) {
    this.bus = bus;
    this.setupListeners();
  }
  
  private setupListeners() {
    // Listen for login events
    this.bus.subscribe<User>('auth.login', (message) => {
      this.currentUser = message.payload;
      this.onLoginSuccess(message.payload);
    });
    
    // Listen for logout events
    this.bus.subscribe('auth.logout', () => {
      this.currentUser = null;
      this.onLogout();
    });
    
    // Listen for token refresh
    this.bus.subscribe<{ token: string }>('auth.token.refreshed', (message) => {
      localStorage.setItem('authToken', message.payload.token);
    });
  }
  
  async login(email: string, password: string) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const { user, token } = await response.json();
      
      // Store token
      localStorage.setItem('authToken', token);
      
      // Notify all tabs
      this.bus.publish('auth.login', user);
      
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }
  
  logout() {
    localStorage.removeItem('authToken');
    this.bus.publish('auth.logout', {});
  }
  
  private onLoginSuccess(user: User) {
    // Update UI in all tabs
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('user-section').style.display = 'block';
  }
  
  private onLogout() {
    // Update UI in all tabs
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('user-section').style.display = 'none';
    
    // Redirect to login if needed
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

// Initialize
const bus = createPubSub();
const crossTab = createCrossTabAdapter({ channelName: 'auth-v1' });
await crossTab.attach(bus);

const authManager = new AuthManager(bus);
```

**Result:** Logging in or out in one tab instantly updates all other tabs, preventing stale authentication states.

---

## Notification System

Display notifications across all tabs.

```typescript
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

class NotificationManager {
  private bus: PubSubBus;
  private container: HTMLElement;
  
  constructor(bus: PubSubBus) {
    this.bus = bus;
    this.container = document.getElementById('notifications')!;
    this.setupListeners();
  }
  
  private setupListeners() {
    this.bus.subscribe<Notification>('notifications.show', (message) => {
      this.showNotification(message.payload);
    });
    
    this.bus.subscribe<{ id: string }>('notifications.dismiss', (message) => {
      this.dismissNotification(message.payload.id);
    });
  }
  
  notify(type: Notification['type'], message: string, duration = 5000) {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      message,
      duration
    };
    
    this.bus.publish('notifications.show', notification);
  }
  
  private showNotification(notification: Notification) {
    const element = document.createElement('div');
    element.id = `notification-${notification.id}`;
    element.className = `notification notification-${notification.type}`;
    element.innerHTML = `
      <span>${notification.message}</span>
      <button onclick="dismissNotification('${notification.id}')">×</button>
    `;
    
    this.container.appendChild(element);
    
    // Auto-dismiss
    if (notification.duration) {
      setTimeout(() => {
        this.bus.publish('notifications.dismiss', { id: notification.id });
      }, notification.duration);
    }
  }
  
  private dismissNotification(id: string) {
    const element = document.getElementById(`notification-${id}`);
    if (element) {
      element.classList.add('fade-out');
      setTimeout(() => element.remove(), 300);
    }
  }
}

// Usage
const notificationManager = new NotificationManager(bus);

// Show notification in all tabs
notificationManager.notify('success', 'Settings saved successfully');
notificationManager.notify('error', 'Failed to load data');
```

---

## Live Collaboration

Real-time collaborative editing indicators.

```typescript
interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
}

class CollaborationManager {
  private bus: PubSubBus;
  private activeUsers = new Map<string, UserPresence>();
  private localUser: UserPresence;
  
  constructor(bus: PubSubBus, localUser: UserPresence) {
    this.bus = bus;
    this.localUser = localUser;
    this.setupListeners();
    this.startHeartbeat();
  }
  
  private setupListeners() {
    // User joined
    this.bus.subscribe<UserPresence>('collab.user.joined', (message) => {
      const user = message.payload;
      this.activeUsers.set(user.userId, user);
      this.renderPresence();
    });
    
    // User left
    this.bus.subscribe<{ userId: string }>('collab.user.left', (message) => {
      this.activeUsers.delete(message.payload.userId);
      this.renderPresence();
    });
    
    // Cursor moved
    this.bus.subscribe<UserPresence>('collab.cursor.moved', (message) => {
      const user = message.payload;
      const existing = this.activeUsers.get(user.userId);
      if (existing) {
        existing.cursor = user.cursor;
        this.renderCursor(user);
      }
    });
    
    // Selection changed
    this.bus.subscribe<UserPresence>('collab.selection.changed', (message) => {
      const user = message.payload;
      const existing = this.activeUsers.get(user.userId);
      if (existing) {
        existing.selection = user.selection;
        this.renderSelection(user);
      }
    });
  }
  
  join() {
    this.bus.publish('collab.user.joined', this.localUser);
  }
  
  leave() {
    this.bus.publish('collab.user.left', { userId: this.localUser.userId });
  }
  
  updateCursor(x: number, y: number) {
    this.bus.publish('collab.cursor.moved', {
      ...this.localUser,
      cursor: { x, y }
    });
  }
  
  updateSelection(start: number, end: number) {
    this.bus.publish('collab.selection.changed', {
      ...this.localUser,
      selection: { start, end }
    });
  }
  
  private startHeartbeat() {
    // Rejoin every 30 seconds to maintain presence
    setInterval(() => {
      this.join();
    }, 30000);
  }
  
  private renderPresence() {
    const container = document.getElementById('active-users');
    container.innerHTML = Array.from(this.activeUsers.values())
      .map(user => `
        <div class="user-indicator" style="border-color: ${user.color}">
          ${user.userName}
        </div>
      `)
      .join('');
  }
  
  private renderCursor(user: UserPresence) {
    if (!user.cursor) return;
    
    let cursor = document.getElementById(`cursor-${user.userId}`);
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = `cursor-${user.userId}`;
      cursor.className = 'remote-cursor';
      cursor.style.borderColor = user.color;
      document.body.appendChild(cursor);
    }
    
    cursor.style.left = `${user.cursor.x}px`;
    cursor.style.top = `${user.cursor.y}px`;
  }
  
  private renderSelection(user: UserPresence) {
    // Render selection highlight
    // Implementation depends on editor
  }
}

// Initialize
const localUser: UserPresence = {
  userId: currentUserId,
  userName: currentUserName,
  color: getRandomColor()
};

const collab = new CollaborationManager(bus, localUser);
collab.join();

// Track cursor
document.addEventListener('mousemove', (e) => {
  collab.updateCursor(e.clientX, e.clientY);
});

// Cleanup on close
window.addEventListener('beforeunload', () => {
  collab.leave();
});
```

---

## Performance Monitoring

Share performance metrics across tabs.

```typescript
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

class PerformanceMonitor {
  private bus: PubSubBus;
  private metrics: PerformanceMetric[] = [];
  
  constructor(bus: PubSubBus) {
    this.bus = bus;
    this.setupListeners();
  }
  
  private setupListeners() {
    this.bus.subscribe<PerformanceMetric>('perf.metric', (message) => {
      this.metrics.push(message.payload);
      this.updateDashboard();
    });
  }
  
  trackMetric(name: string, value: number, unit: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };
    
    this.bus.publish('perf.metric', metric);
  }
  
  private updateDashboard() {
    // Group by metric name
    const grouped = this.metrics.reduce((acc, m) => {
      if (!acc[m.name]) acc[m.name] = [];
      acc[m.name].push(m);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);
    
    // Calculate averages
    const averages = Object.entries(grouped).map(([name, metrics]) => {
      const avg = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      return { name, avg, unit: metrics[0].unit };
    });
    
    // Render
    const container = document.getElementById('perf-metrics');
    container.innerHTML = averages
      .map(({ name, avg, unit }) => `
        <div class="metric">
          <span class="metric-name">${name}</span>
          <span class="metric-value">${avg.toFixed(2)} ${unit}</span>
        </div>
      `)
      .join('');
  }
}

// Usage
const perfMonitor = new PerformanceMonitor(bus);

// Track page load time
window.addEventListener('load', () => {
  const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
  perfMonitor.trackMetric('Page Load Time', loadTime, 'ms');
});

// Track API response time
async function fetchData(url: string) {
  const start = performance.now();
  const response = await fetch(url);
  const end = performance.now();
  
  perfMonitor.trackMetric('API Response Time', end - start, 'ms');
  
  return response.json();
}
```

---

## Transport Selection

Examples using different transports.

### BroadcastChannel (Best Performance)

```typescript
import {
  createBroadcastChannelTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/broadcast-channel';

const transport = createBroadcastChannelTransport({
  channelName: 'high-freq-v1'
});

const crossTab = createCrossTabAdapter({
  channelName: 'high-freq-v1',
  transport,
  batchIntervalMs: 10,
  maxBatchSize: 50,
});
```

### SharedWorker (Reliable)

```typescript
import {
  createSharedWorkerTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/shared-worker';

const transport = createSharedWorkerTransport({
  channelName: 'reliable-v1',
  workerUrl: '/workers/broker.js',
  reconnectAttempts: 5
});

const crossTab = createCrossTabAdapter({
  channelName: 'reliable-v1',
  transport
});
```

### Auto (Smart Fallback)

```typescript
import {
  createAutoTransport
} from '@belyas/pubsub-mfe/adapters/cross-tab/transports/auto';

const transport = createAutoTransport({
  channelName: 'smart-v1',
  preferredMode: 'SharedWorker',
  sharedWorkerUrl: '/workers/broker.js',
  onFallback: (from, to, reason) => {
    console.log(`Transport fallback: ${from} → ${to} (${reason})`);
  }
});
```

---

## Next Steps

- **[Cross-Tab Guide](/guide/adapters/cross-tab)** - Complete guide
- **[Pattern Examples](/examples/patterns)** - Advanced patterns
- **[Cross-Tab API](/api/cross-tab)** - API reference
- **[Performance](/docs/performance-benchmarks)** - Benchmarks

::: tip 💡 Best Practice
Always enable batching and deduplication for high-frequency updates:
```typescript
const crossTab = createCrossTabAdapter({
  channelName: 'my-app',
  batchIntervalMs: 10,
  maxBatchSize: 50,
  dedupeWindowMs: 60000,
  dedupeCacheSize: 1000,
});
```
:::
