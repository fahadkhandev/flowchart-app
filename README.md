# Flowchart App

A web-based visual workflow editor built with Vue 3. Create, edit, and manage flowchart nodes on an interactive canvas with drag-and-drop, a URL-driven details drawer, undo/redo, and keyboard accessibility.

---

## Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9

---

## Installation

```bash
npm install
```

---

## Running the App

```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Running Tests

```bash
# Run all tests once
npm run test -- --run

# Run tests with coverage report
npm run test -- --run --coverage

# Watch mode (re-runs on file changes)
npm run test
```

Coverage output is written to `coverage/`.

---

## Project Structure

```
flowchart-app/
├── public/
│   ├── favicon.svg
│   └── icons.svg              # SVG sprite (used for legacy references)
├── src/
│   ├── api/
│   │   └── nodes.js           # API layer (fetch, create, update, delete, position, relayout)
│   ├── components/
│   │   ├── panels/
│   │   │   ├── AddCommentPanel.vue
│   │   │   ├── BusinessHoursPanel.vue
│   │   │   ├── DisplayOnlyPanel.vue
│   │   │   └── SendMessagePanel.vue
│   │   ├── BaseNode.vue       # Custom Vue Flow node component
│   │   ├── CanvasToolbar.vue  # Add Node / Undo / Redo / Zoom / Lock toolbar
│   │   ├── ConnectorChildEdge.vue
│   │   ├── CreateNodeModal.vue
│   │   ├── DetailsDrawer.vue  # Slide-in node details panel
│   │   ├── FlowCanvas.vue     # Vue Flow canvas wrapper
│   │   ├── NodeSidebar.vue    # Draggable node blocks sidebar
│   │   └── TreeEdge.vue
│   ├── router/
│   │   └── index.js           # Vue Router (/ and /node/:id)
│   ├── stores/
│   │   ├── flowchartStore.js  # Pinia store — nodes, edges, selection
│   │   ├── historyStore.js    # Pinia store — undo/redo command history
│   │   └── index.js
│   ├── utils/
│   │   ├── nodeTypes.js       # NODE_TYPES, icons, labels, colors
│   │   ├── text.js            # truncateText helper
│   │   └── validation.js      # validateRequired, validateBusinessHours, etc.
│   ├── views/
│   │   └── CanvasView.vue     # Main view — composes all components
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI/CD pipeline
├── vite.config.js
└── package.json
```

---

## How to Create a Node

1. **Single-click** any existing node on the canvas to select it (blue ring appears)
2. The **"+" button** in the toolbar activates — click it to open the Create Node modal
3. Fill in **Title**, **Description**, and **Type**, then hit **Create Node**
4. The new node is added as a child of the selected node and the tree re-layouts automatically

> Business Hours nodes cannot have children — the "+" button stays disabled when one is selected.

---

## Key Design Decisions

### URL-driven Details Drawer
The Details Drawer opens by pushing the route to `/node/:id` on a single click. This makes the drawer state bookmarkable and browser-history-aware. Double-clicking is not required — one click selects the node and opens the drawer simultaneously.

### TanStack Query as the Server-State Layer
All API interactions go through TanStack Query mutations. Pinia stores only ephemeral UI state (undo/redo history, selection).

### Controlled Vue Flow
Vue Flow is used in controlled mode (`v-model:nodes` / `v-model:edges`) so the Pinia store owns the canonical node list. Reverting store state automatically reverts the canvas — which makes undo/redo straightforward.

### Command Pattern for Undo/Redo
Each reversible action (move, edit, delete) is a `{ do, undo, description }` command pushed onto a bounded history stack (max 50 items). Keyboard shortcuts: `Ctrl+Z` / `Cmd+Z` to undo, `Ctrl+Y` / `Cmd+Shift+Z` to redo.

### In-Memory API Layer
The remote payload is fetched once on first load and cached in a module-level array. All mutations operate on this in-memory state with a simulated 300 ms network delay, making the app fully functional without a real backend.

---

## Node Types

| Type | Label | Icon | Editable | Can Have Children |
|------|-------|------|----------|-------------------|
| `sendMessage` | Send Message | PaperAirplaneIcon | ✅ | ✅ |
| `addComment` | Add Comment | ChatBubbleLeftIcon | ✅ | ✅ |
| `dateTime` | Business Hours | CalendarDaysIcon | ✅ | ❌ |
| `trigger` | Trigger | BoltIcon | ❌ read-only | ✅ |
| `dateTimeConnector` | Connector | — | ❌ read-only | ❌ |

Icons are from [@heroicons/vue](https://heroicons.com/) (24/outline).

### Send Message
Manages a `payload` array of text entries and file attachments. Supports uploading images, PDFs, and Word documents (max 10 MB each).

### Add Comment
Single comment textarea with save and clear actions.

### Business Hours
Per-day open/close time configuration with timezone display and `closeTime > openTime` validation.

### Display-Only (Trigger / Connector)
Rendered on the canvas for context but cannot be edited or deleted.

---

## Toolbar

| Button | Action |
|--------|--------|
| `+` | Add child node (requires a node to be selected; disabled for Business Hours) |
| Undo | Undo last action (`Ctrl+Z` / `Cmd+Z`) |
| Redo | Redo last undone action (`Ctrl+Y` / `Cmd+Shift+Z`) |
| Zoom In / Out | Zoom the canvas |
| Fit View | Fit all nodes into view |
| Lock | Lock canvas to prevent accidental drags |

---

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push and pull request to `Master`:

1. Install dependencies (`npm ci`)
2. Run tests with coverage (`npm run test -- --run --coverage`)
3. Upload coverage report as a workflow artifact
4. Build the app (`npm run build`)

The pipeline blocks merging if tests fail.
