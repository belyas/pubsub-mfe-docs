# Basic Usage Examples

Learn PubSub MFE through practical examples.

## Simple Publish/Subscribe

The most basic usage:

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'my-app' });

// Subscribe to messages
bus.subscribe('notifications.#', (msg) => {
  console.log('Notification:', msg.payload);
});

// Publish a message
bus.publish('notifications.info', {
  title: 'Welcome!',
  message: 'Thanks for using PubSub MFE'
});
```

## Shopping Cart Example

A complete shopping cart with multiple microfrontends:

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'e-commerce' });

// Cart state management
let cartItems: CartItem[] = [];

// Cart MFE: Add items
function addToCart(sku: string, qty: number) {
  bus.publish('cart.item.add', { sku, qty, timestamp: Date.now() });
}

// Header MFE: Update badge count
bus.subscribe('cart.item.+', () => {
  const count = cartItems.length;
  updateCartBadge(count);
});

// Analytics MFE: Track events
bus.subscribe('cart.#', (msg) => {
  analytics.track(msg.topic, {
    ...msg.payload,
    timestamp: msg.timestamp
  });
});

// Product MFE: Handle add to cart
document.querySelector('#add-to-cart-btn')?.addEventListener('click', () => {
  const sku = getCurrentProductSKU();
  const qty = getSelectedQuantity();
  addToCart(sku, qty);
});
```

## User Authentication Flow

Coordinate auth state across microfrontends:

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

const bus = createPubSub({ app: 'my-app', origin: 'auth-service' });

// Auth service: Login
async function login(email: string, password: string) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const user = await response.json();
    
    // Broadcast login success
    bus.publish('user.login.success', {
      userId: user.id,
      email: user.email,
      name: user.name,
      permissions: user.permissions
    });
  } catch (error) {
    bus.publish('user.login.error', {
      error: error.message
    });
  }
}

// Header MFE: Update user menu
bus.subscribe('user.login.success', (msg) => {
  const { name, email } = msg.payload;
  updateUserMenu({ name, email });
  showWelcomeMessage(name);
});

// Profile MFE: Load user data
bus.subscribe('user.login.success', (msg) => {
  const { userId } = msg.payload;
  loadUserProfile(userId);
});

// All MFEs: Handle logout
bus.subscribe('user.logout', () => {
  clearUserData();
  redirectToLogin();
});
```

## Modal Management

Decouple modal controls from content:

```typescript
// Modal Manager MFE
bus.subscribe('modal.open', (msg) => {
  const { modalId, props } = msg.payload;
  openModal(modalId, props);
});

bus.subscribe('modal.close', (msg) => {
  const { modalId } = msg.payload;
  closeModal(modalId);
});

// Product MFE: Open checkout modal
function handleBuyNow() {
  bus.publish('modal.open', {
    modalId: 'checkout',
    props: {
      items: getCartItems(),
      total: getCartTotal()
    }
  });
}

// Anywhere: Close modal
bus.publish('modal.close', { modalId: 'checkout' });
```

## Form Validation

Real-time validation across form sections:

```typescript
interface ValidationResult {
  field: string;
  valid: boolean;
  errors?: string[];
}

// Form Section 1: Email validation
document.querySelector('#email')?.addEventListener('blur', (e) => {
  const email = (e.target as HTMLInputElement).value;
  const valid = validateEmail(email);
  
  bus.publish('form.field.validate', {
    section: 'contact',
    field: 'email',
    valid,
    errors: valid ? [] : ['Invalid email format']
  });
});

// Form Section 2: Password validation
document.querySelector('#password')?.addEventListener('blur', (e) => {
  const password = (e.target as HTMLInputElement).value;
  const valid = validatePassword(password);
  
  bus.publish('form.field.validate', {
    section: 'credentials',
    field: 'password',
    valid,
    errors: valid ? [] : ['Password must be at least 8 characters']
  });
});

// Submit Button: Enable/disable based on validation
const validFields = new Set<string>();

bus.subscribe('form.field.validate', (msg) => {
  const { field, valid } = msg.payload;
  
  if (valid) {
    validFields.add(field);
  } else {
    validFields.delete(field);
  }
  
  const allValid = validFields.size === REQUIRED_FIELDS.length;
  document.querySelector('#submit-btn')?.toggleAttribute('disabled', !allValid);
});
```

## Notifications System

Centralized notification management:

```typescript
type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

// Notification Manager
const notifications: Notification[] = [];

bus.subscribe('notification.show', (msg) => {
  const notification: Notification = {
    id: crypto.randomUUID(),
    ...msg.payload
  };
  
  notifications.push(notification);
  renderNotification(notification);
  
  // Auto-dismiss
  if (notification.duration) {
    setTimeout(() => {
      bus.publish('notification.dismiss', { id: notification.id });
    }, notification.duration);
  }
});

bus.subscribe('notification.dismiss', (msg) => {
  const index = notifications.findIndex(n => n.id === msg.payload.id);
  if (index !== -1) {
    notifications.splice(index, 1);
    removeNotification(msg.payload.id);
  }
});

// Usage: Show success notification
bus.publish('notification.show', {
  type: 'success',
  title: 'Order Placed',
  message: 'Your order has been successfully placed',
  duration: 5000
});

// Usage: Show error notification
bus.publish('notification.show', {
  type: 'error',
  title: 'Payment Failed',
  message: 'Please check your payment details and try again',
  duration: 10000
});
```

## Theme Switcher

Synchronize theme across components:

```typescript
type Theme = 'light' | 'dark' | 'auto';

// Theme Manager
let currentTheme: Theme = (localStorage.getItem('theme') as Theme) || 'auto';

bus.subscribe('theme.change', (msg) => {
  const { theme } = msg.payload;
  currentTheme = theme;
  
  // Apply theme
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Notify all components
  bus.publish('theme.changed', { theme });
});

// Header: Theme toggle button
document.querySelector('#theme-toggle')?.addEventListener('click', () => {
  const nextTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
  bus.publish('theme.change', { theme: nextTheme });
});

// All components: React to theme changes
bus.subscribe('theme.changed', (msg) => {
  const { theme } = msg.payload;
  updateComponentTheme(theme);
});

// System preference detection
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', (e) => {
  if (currentTheme === 'auto') {
    const theme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
});
```

## Search with Debounce

Handle search input across multiple sources:

```typescript
import { debounce } from 'lodash-es';

// Search Input Component
const searchInput = document.querySelector('#search') as HTMLInputElement;

const debouncedSearch = debounce((query: string) => {
  bus.publish('search.query', { query, timestamp: Date.now() });
}, 300);

searchInput?.addEventListener('input', (e) => {
  const query = (e.target as HTMLInputElement).value;
  debouncedSearch(query);
});

// Products Search
bus.subscribe('search.query', async (msg) => {
  const { query } = msg.payload;
  const results = await searchProducts(query);
  
  bus.publish('search.results.products', {
    query,
    results,
    count: results.length
  });
});

// Articles Search
bus.subscribe('search.query', async (msg) => {
  const { query } = msg.payload;
  const results = await searchArticles(query);
  
  bus.publish('search.results.articles', {
    query,
    results,
    count: results.length
  });
});

// Results Aggregator
let searchResults = {
  products: [],
  articles: []
};

bus.subscribe('search.results.+', (msg) => {
  const category = msg.topic.split('.').pop();
  searchResults[category] = msg.payload.results;
  
  renderSearchResults(searchResults);
});

// Clear search
bus.subscribe('search.clear', () => {
  searchInput.value = '';
  searchResults = { products: [], articles: [] };
  renderSearchResults(searchResults);
});
```

## Lazy Loading Modules

Coordinate lazy-loaded microfrontend initialization:

```typescript
interface Module {
  name: string;
  loader: () => Promise<unknown>;
  loaded: boolean;
}

const modules: Record<string, Module> = {
  checkout: {
    name: 'checkout',
    loader: () => import('./modules/checkout'),
    loaded: false
  },
  profile: {
    name: 'profile',
    loader: () => import('./modules/profile'),
    loaded: false
  }
};

// Module Loader
bus.subscribe('module.load', async (msg) => {
  const { moduleName } = msg.payload;
  const module = modules[moduleName];
  
  if (!module) {
    bus.publish('module.error', {
      moduleName,
      error: 'Module not found'
    });
    return;
  }
  
  if (module.loaded) {
    bus.publish('module.loaded', { moduleName });
    return;
  }
  
  try {
    bus.publish('module.loading', { moduleName });
    await module.loader();
    module.loaded = true;
    bus.publish('module.loaded', { moduleName });
  } catch (error) {
    bus.publish('module.error', {
      moduleName,
      error: error.message
    });
  }
});

// Usage: Load module on route change
router.on('/checkout', () => {
  bus.publish('module.load', { moduleName: 'checkout' });
});

// UI: Show loading state
bus.subscribe('module.loading', (msg) => {
  showLoadingSpinner(msg.payload.moduleName);
});

bus.subscribe('module.loaded', (msg) => {
  hideLoadingSpinner(msg.payload.moduleName);
});
```

## Next Steps

- **[Cross-Tab Examples](/examples/cross-tab)** - Multi-tab synchronization
- **[History Examples](/examples/history)** - Event replay patterns
- **[Schema Examples](/examples/schema)** - Message validation
- **[Patterns](/examples/patterns)** - Advanced patterns

::: tip 💡 Interactive Playground
Try these examples live in our [CodeSandbox](https://codesandbox.io) or clone the [examples repository](https://github.com/belyas/pubsub-mfe/tree/main/examples).
:::
