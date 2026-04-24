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
│   └── icons.svg              # SVG sprite for node icons
├── src/
│   ├── api/
│   │   └── nodes.js           # API layer (fetch, create, update, delete, position)
│   ├── components/
│   │   ├── panels/
│   │   │   ├── AddCommentPanel.vue
│   │   │   ├── BusinessHoursPanel.vue
│   │   │   ├── DisplayOnlyPanel.vue
│   │   │   └── SendMessagePanel.vue
│   │   ├── BaseNode.vue       # Custom Vue Flow node component
│   │   ├── CanvasToolbar.vue  # Create / Undo / Redo toolbar
│   │   ├── CreateNodeModal.vue
│   │   ├── DetailsDrawer.vue  # Slide-in node details panel
│   │   └── FlowCanvas.vue     # Vue Flow canvas wrapper
│   ├── router/
│   │   └── index.js           # Vue Router (/ and /node/:id)
│   ├── stores/
│   │   ├── flowchartStore.js  # Pinia store — nodes, edges, selection
│   │   ├── historyStore.js    # Pinia store — undo/redo command history
│   │   └── index.js
│   ├── utils/
│   │   ├── nodeTypes.js       # NODE_TYPES, isDisplayOnly, getNodeIcon, etc.
│   │   ├── text.js            # truncateText
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

## Key Design Decisions

### URL-driven Details Drawer
The Details Drawer opens and closes by pushing/replacing the route (`/node/:id`). This makes the drawer state bookmarkable and browser-history-aware without extra coordination logic. Navigating to `/node/abc` opens the drawer for node `abc`; navigating back to `/` closes it.

### TanStack Query as the Server-State Layer
All API interactions (fetch, create, update, delete, position) go through TanStack Query mutations. The query cache is the source of truth for persisted data. Pinia stores only ephemeral UI state (undo/redo history, selection).

**Query client config** (as specified):
```js
{
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      networkMode: 'always',
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
    }
  }
}
```

### Controlled Vue Flow
Vue Flow is used in controlled mode (`v-model:nodes` / `v-model:edges`) so the Pinia store owns the canonical node list. Reverting store state automatically reverts the canvas — which makes undo/redo straightforward.

### Command Pattern for Undo/Redo
Each reversible action (move, edit, delete) is represented as a `{ do, undo, description }` command object pushed onto a bounded history stack (max 50 items) in `historyStore`. Keyboard shortcuts: `Ctrl+Z` / `Cmd+Z` to undo, `Ctrl+Y` / `Cmd+Shift+Z` to redo.

### In-Memory API Layer
The remote payload (`https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com/candidate-assessments/payload.json`) is fetched once on first load and cached in a module-level array. All mutations (create, update, delete, position) operate on this in-memory state with a simulated 300 ms network delay, making the app fully functional without a real backend.

---

## Node Types

| Type | Label | Editable | Draggable |
|------|-------|----------|-----------|
| `sendMessage` | Send Message | ✅ | ✅ |
| `addComment` | Add Comment | ✅ | ✅ |
| `dateTime` | Business Hours | ✅ | ✅ |
| `trigger` | Trigger | ❌ (read-only) | ❌ |
| `dateTimeConnector` | Connector | ❌ (read-only) | ❌ |

### Send Message
Manages a `payload` array of text entries and file attachments. Supports uploading images, PDFs, and Word documents (max 10 MB each).

### Add Comment
Single comment textarea with save and clear actions.

### Business Hours
Per-day open/close time configuration with timezone display and `closeTime > openTime` validation.

### Display-Only (Trigger / Connector)
Rendered on the canvas for context but cannot be edited, deleted, or dragged.

---

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push and pull request to `Master`:

1. Install dependencies (`npm ci`)
2. Run tests with coverage (`npm run test -- --run --coverage`)
3. Upload coverage report as a workflow artifact
4. Build the app (`npm run build`)

The pipeline blocks merging if tests fail.
# vue3-flowchart
# flowchart-app
