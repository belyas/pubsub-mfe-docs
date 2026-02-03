# Schema Validation Example

PubSub MFE includes a built-in lightweight JSON Schema validator for zero-dependency message validation. This example demonstrates how to use the built-in validator to ensure type safety at publish-time.

## Built-in Schema Validation

### Register schemas and enable validation

```typescript
import { createPubSub } from '@belyas/pubsub-mfe'

// Create bus with validation mode
const bus = createPubSub({ 
  app: 'my-app',
  validationMode: 'strict' // 'strict' | 'warn' | 'off'
})

// Register a schema with version identifier
bus.registerSchema('cart.item.add@1', {
  type: 'object',
  properties: {
    sku: { type: 'string', minLength: 1 },
    qty: { type: 'number', minimum: 1 },
    price: { type: 'number', minimum: 0 }
  },
  required: ['sku', 'qty'],
  additionalProperties: false
})

// Publish with schema validation
bus.publish('cart.item.add', 
  { sku: 'ABC123', qty: 2, price: 19.99 },
  { schemaVersion: 'cart.item.add@1' }
)

// Invalid payload throws in strict mode
try {
  bus.publish('cart.item.add',
    { sku: '', qty: -1 }, // Invalid: empty sku, negative qty
    { schemaVersion: 'cart.item.add@1' }
  )
} catch (error) {
  console.error('Validation failed:', error.message)
  // Validation failed for schema "cart.item.add@1": sku: String length must be at least 1; qty: Number must be at least 1
}
```

## Validation Modes

### Strict Mode (Recommended for Production)

```typescript
const bus = createPubSub({ validationMode: 'strict' });

// Throws on validation failure
bus.publish('cart.item.add', 
  { invalid: 'data' }, 
  { schemaVersion: 'cart.item.add@1' }
); // ❌ Throws Error
```

### Warn Mode (Development/Debugging)

```typescript
const bus = createPubSub({ 
  validationMode: 'warn',
  debug: true // Enable console warnings
});

// Logs warning but still publishes
bus.publish('cart.item.add', 
  { invalid: 'data' }, 
  { schemaVersion: 'cart.item.add@1' }
); // ⚠️ Logs warning, message still dispatches
```

### Off Mode (No Validation)

```typescript
const bus = createPubSub({ validationMode: 'off' });

// No validation performed
bus.publish('cart.item.add', 
  { anything: 'goes' }, 
  { schemaVersion: 'cart.item.add@1' }
); // ✅ Published without validation
```

## Advanced Schema Features

### Nested Objects

```typescript
bus.registerSchema('user.profile.update@1', {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    profile: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
        age: { type: 'number', minimum: 0, maximum: 150 }
      },
      required: ['name', 'email']
    }
  },
  required: ['userId', 'profile']
});
```

### Arrays

```typescript
bus.registerSchema('order.items@1', {
  type: 'object',
  properties: {
    orderId: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          quantity: { type: 'number', minimum: 1 }
        },
        required: ['sku', 'quantity']
      }
    }
  },
  required: ['orderId', 'items']
});
```

### Enums

```typescript
bus.registerSchema('order.status@1', {
  type: 'object',
  properties: {
    orderId: { type: 'string' },
    status: { 
      type: 'string',
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    }
  },
  required: ['orderId', 'status']
});
```

## Security Features

The built-in validator includes security protections:

- **Prototype pollution prevention**: Dangerous properties like `__proto__`, `constructor`, and `prototype` are blocked
- **ReDoS protection**: Unsafe regex patterns are detected and rejected
- **String length limits**: Regex validation limited to strings ≤ 10,000 characters

```typescript
// ❌ These will throw on registration
bus.registerSchema('dangerous@1', {
  type: 'object',
  properties: {
    __proto__: { type: 'string' } // Error: dangerous property
  }
});

bus.registerSchema('unsafe-regex@1', {
  type: 'string',
  pattern: '(a+)+b' // Error: unsafe regex (exponential backtracking)
});
```

## Adapter-level Validation

Enable schema validation for messages coming from iframes:

```typescript
import { createIframeHost } from '@belyas/pubsub-mfe/adapters/iframe';

const host = createIframeHost(bus, {
  trustedOrigins: ['https://embed.example.com'],
  enforceSchemaValidation: true, // Validate all iframe messages
  onValidationError: (iframe, topic, error) => {
    console.error('Iframe sent invalid message:', topic, error)
  }
});
```

## Diagnostic Monitoring

Monitor validation failures with diagnostics:

```typescript
const bus = createPubSub({
  validationMode: 'warn',
  onDiagnostic: (event) => {
    if (event.type === 'validation-error') {
      console.error('Validation failed:', {
        topic: event.topic,
        schemaVersion: event.schemaVersion,
        errors: event.errors,
        mode: event.mode
      })
    }
  }
});
```

## Schema Versioning Best Practices

Use semantic versioning in schema identifiers:

```typescript
// Initial schema
bus.registerSchema('user.register@1', {
  type: 'object',
  properties: {
    email: { type: 'string' },
    password: { type: 'string' }
  },
  required: ['email', 'password']
});

// Version 2: Add optional fields (backward compatible)
bus.registerSchema('user.register@2', {
  type: 'object',
  properties: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string' }, // New optional field
    marketingOptIn: { type: 'boolean' } // New optional field
  },
  required: ['email', 'password']
});

// Subscribers can handle multiple versions
bus.subscribe('user.register', (msg) => {
  if (msg.schemaVersion === 'user.register@2') {
    // Handle v2 with new fields
  } else {
    // Handle v1 or unversioned
  }
});
```

## Using External Validators

If you need more advanced validation (e.g., AJV with custom keywords), you can still use external validators:

```typescript
import Ajv from 'ajv';

const ajv = new Ajv();
const validateItem = ajv.compile({ /* your schema */ });

function publishAddItem(payload: unknown) {
  if (!validateItem(payload)) {
    console.error('Invalid payload', validateItem.errors)
    return;
  }
  
  bus.publish('cart.item.add', payload);
}
```

See also: [Schema Validation](/guide/schema-validation) and [Types](/api/types).
