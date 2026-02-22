# DevTools Chrome Extension

The **PubSub MFE DevTools** extension adds a dedicated panel to Chrome DevTools for inspecting and debugging your `@belyas/pubsub-mfe` bus instances in real time.

<div class="tip custom-block" style="padding-top: 8px">
Available from v0.8.0. Requires the <code>enableDevTools</code> flag to be set when creating the bus.
</div>

## Features

- **Auto-detection** — Automatically discovers active PubSub bus instances on the page
- **Real-time message feed** — Live stream of all published messages with topic, source, adapter, and payload
- **Subscription tree** — Overview of all active subscriptions and their handler counts
- **Performance metrics** — Latency (avg / p95 / p99), throughput, and total message count
- **Error capture** — Handler errors and validation diagnostics surfaced in a dedicated tab
- **Adapter status** — Tracks which adapters (cross-tab, iframe, history) are attached and active
- **Filtering** — Filter messages by topic pattern, source, or adapter type
- **JSON export** — Export all captured data (messages, errors, stats) to a JSON file

## Setup

### 1. Build the extension

From the repository root:

```bash
cd pubsub-mfe-chrome-exstension
./build.sh
```

The compiled extension is output to `pubsub-mfe-chrome-exstension/dist`.

### 2. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `pubsub-mfe-chrome-exstension/dist` folder

### 3. Enable DevTools integration in your app

```typescript
import { createPubSub } from '@belyas/pubsub-mfe';

const bus = createPubSub({
  app: 'my-app',
  enableDevTools: true,
  debug: true,
});
```

::: warning Production safety
Avoid leaving DevTools enabled in production. A common pattern:

```typescript
const bus = createPubSub({
  app: 'my-app',
  enableDevTools: process.env.NODE_ENV !== 'production',
  debug: process.env.NODE_ENV !== 'production',
});
```
:::

## Using the Panel

Once the extension is loaded and your app creates a bus with `enableDevTools: true`:

1. Open your application in a browser tab
2. Open Chrome DevTools (<kbd>F12</kbd> or <kbd>Cmd+Opt+I</kbd>)
3. Navigate to the **PubSub MFE** tab
4. Select a detected bus instance from the dropdown

### Messages Tab

The default tab shows a live feed of all published messages in a table with the following columns:

| Column   | Description                                                   |
| -------- | ------------------------------------------------------------- |
| Time     | Timestamp of when the message was published                   |
| Topic    | The message topic (e.g. `cart.item.add`)                      |
| Source   | The `meta.source` field, if provided by the publisher         |
| Adapter  | Which adapter delivered the message (local, cross-tab, iframe)|
| Payload  | JSON preview of the message payload                           |

Messages can be filtered using the sidebar controls:
- **Topic filter** — match by topic pattern
- **Source filter** — match by source string
- **Adapter checkboxes** — toggle visibility per adapter type

### Performance Tab

Displays live performance metrics for the selected bus:

- **Avg Latency** — average message dispatch latency
- **Throughput** — messages per second
- **Total Messages** — cumulative count

### Errors Tab

Captures and displays handler errors and validation diagnostics. Each entry includes:
- Error type and message
- Associated topic
- Stack trace (when available)

### Adapters Tab

Shows which adapters are currently attached to the selected bus and their status:

| Adapter   | Description                                                  |
| --------- | ------------------------------------------------------------ |
| cross-tab | BroadcastChannel / SharedWorker / Storage adapter            |
| iframe    | Parent-child iframe communication bridge                     |
| history   | IndexedDB-based message persistence and replay               |
| local     | Default — messages published within the same page context     |

Adapters are tracked via explicit lifecycle notifications. When an adapter calls `attach(bus)`, the bus emits an `ADAPTER_ATTACHED` event to the DevTools pipeline. Similarly, `detach()` emits `ADAPTER_DETACHED`.

### Stats Tab

Raw bus statistics including:
- Instance ID and app name
- Handler count and subscription patterns
- Retention buffer size and capacity
- Published / dispatched message counters
- Disposed status

## Architecture

The extension uses a multi-layer messaging pipeline to bridge the page context with the DevTools panel:

```
Page Context                    Extension Context
┌─────────────────────────┐     ┌────────────────────────────┐
│ PubSub bus + DevTools    │     │ content-script.ts          │
│ registry                 │     │ (message relay)            │
│                          │     │                            │
│ injected-script.ts       │────▶│ chrome.runtime.sendMessage │
│ (hooks + event batching) │     └─────────────┬──────────────┘
└──────────┬──────────────┘                    │
           │                                   ▼
    window.postMessage              ┌──────────────────────┐
                                    │ background.ts        │
                                    │ (per-tab buffering)  │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ devtools.ts          │
                                    │ (panel bridge)       │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ panel.ts             │
                                    │ (UI rendering)       │
                                    └──────────────────────┘
```

### Pipeline stages

1. **Bus**: When `enableDevTools: true`, the bus emits `CustomEvent`s on `window` for publish, subscribe, unsubscribe, diagnostics, and adapter lifecycle events. A global DevTools registry tracks all bus instances.

2. **Injected script**: Runs in the page context. Listens for registry and bus events, batches them (~16ms / 50 events), and posts to the content script via `window.postMessage`.

3. **Content script**: Validates and filters events, forwarding them to the background via `chrome.runtime.sendMessage`.

4. **Background service worker**: Buffers events per tab (up to 100). When a DevTools panel connects for a tab, it flushes buffered events and relays subsequent ones in real time.

5. **DevTools page**: Creates the panel and connects to the background worker. Buffers events until the panel is visible, then flushes them.

6. **Panel**: Processes events, maintains state (buses, messages, errors, adapters, metrics), and renders the UI with virtualized scrolling.

### Event types

| Event                  | Emitted by        | Description                          |
| ---------------------- | ----------------- | ------------------------------------ |
| `BUS_DETECTED`         | Injected script   | New bus instance discovered          |
| `BUS_DISPOSED`         | Injected script   | Bus instance disposed                |
| `MESSAGE_PUBLISHED`    | Publish hooks      | Message published on the bus         |
| `SUBSCRIPTION_ADDED`   | Bus CustomEvent   | New subscription registered          |
| `SUBSCRIPTION_REMOVED` | Bus CustomEvent   | Subscription removed                 |
| `DIAGNOSTIC_EVENT`     | Bus CustomEvent   | Diagnostic emitted (errors, warnings)|
| `ADAPTER_ATTACHED`     | Bus CustomEvent   | Adapter attached to bus              |
| `ADAPTER_DETACHED`     | Bus CustomEvent   | Adapter detached from bus            |
| `STATS_UPDATE`         | Polling (1s)      | Periodic bus statistics snapshot     |

## Toolbar Controls

| Button | Action                                    |
| ------ | ----------------------------------------- |
| ⏸      | Pause / resume the live event stream      |
| 🗑️     | Clear all captured messages and errors    |
| 💾     | Export current session data as JSON       |

## Troubleshooting

### No bus detected

- Verify `enableDevTools: true` is set in your `createPubSub()` config
- Refresh the page after loading or reloading the extension
- Make sure the DevTools panel is open on the correct tab

### Events not appearing

- Check the sidebar filters — topic, source, or adapter filters may be hiding events
- Make sure the panel is not paused (⏸ button)
- Re-open the DevTools panel after an extension reload

### Adapters showing as "local"

- Ensure you are using `@belyas/pubsub-mfe` v0.8.0 or later, which includes adapter lifecycle notifications
- Adapters must call `attach(bus)` after the bus is created with `enableDevTools: true`

### Debugging the extension itself

- **Panel UI** — Right-click inside the panel → Inspect to open a nested DevTools
- **Background worker** — Inspect the service worker from `chrome://extensions`
- **Content / injected scripts** — Use the regular page DevTools console
