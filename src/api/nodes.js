/**
 * API layer for node operations.
 *
 * Fetches the initial node list from the remote payload on first call,
 * caches it in-memory, and exposes CRUD + position-update operations.
 * All functions return Promises and simulate ~300 ms network latency.
 *
 * Remote payload shape (per node):
 * {
 *   id: string | number,
 *   name?: string,
 *   type: string,           // 'sendMessage' | 'addComment' | 'dateTime' | 'dateTimeConnector' | 'trigger' | …
 *   parentId: string | number,
 *   data: { … }             // type-specific fields
 * }
 *
 * Normalised internal shape (Vue Flow compatible):
 * {
 *   id: string,
 *   type: string,
 *   position: { x: number, y: number },
 *   data: {
 *     title: string,
 *     description: string,
 *     …type-specific fields
 *   }
 * }
 */

// In dev the Vite proxy rewrites /api/payload → the S3 URL, avoiding CORS.
// In production we fetch the payload directly from the hosted JSON file.
const PAYLOAD_URL = '/api/payload'

const SIMULATED_DELAY_MS = 300
const BUSINESS_HOUR_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const NODE_WIDTH = 260          // card width in px
const CONNECTOR_WIDTH = 110     // rendered width of the connector pill
const NODE_HEIGHT = 120         // approximate card height for all node types
const H_GAP = 100               // horizontal gap between sibling subtrees
const V_GAP = 50               // vertical gap between a node bottom and its children top
const CANVAS_PADDING_X = 80
const CANVAS_PADDING_Y = 80

/** In-memory node store. Null until first fetch. */
let nodesCache = null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps a value in a Promise that resolves after SIMULATED_DELAY_MS.
 * @template T
 * @param {T} value
 * @returns {Promise<T>}
 */
function delayed(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_DELAY_MS))
}

/**
 * Converts the API's `times` array into the editor-friendly `businessHours`
 * shape used by the business hours panel.
 *
 * @param {{ times?: Array<{ day: string, startTime: string, endTime: string }>, businessHours?: Array<{ day: string, isOpen: boolean, openTime: string, closeTime: string }> }} data
 * @returns {Array<{ day: string, isOpen: boolean, openTime: string, closeTime: string }>}
 */
function normaliseBusinessHours(data = {}) {
  if (Array.isArray(data.businessHours) && data.businessHours.length > 0) {
    return data.businessHours.map((entry) => ({
      day: entry.day,
      isOpen: entry.isOpen ?? Boolean(entry.openTime && entry.closeTime),
      openTime: entry.openTime ?? '',
      closeTime: entry.closeTime ?? '',
    }))
  }

  const timesByDay = new Map((data.times ?? []).map((entry) => [entry.day, entry]))

  return BUSINESS_HOUR_DAYS.map((day) => {
    const entry = timesByDay.get(day)

    return {
      day,
      isOpen: Boolean(entry),
      openTime: entry?.startTime ?? '',
      closeTime: entry?.endTime ?? '',
    }
  })
}

/**
 * Converts editor-friendly business hours back into the API's `times` shape.
 *
 * @param {Array<{ day: string, isOpen: boolean, openTime: string, closeTime: string }>} businessHours
 * @returns {Array<{ day: string, startTime: string, endTime: string }>}
 */
function denormaliseBusinessHours(businessHours = []) {
  return businessHours
    .filter((entry) => entry.isOpen && entry.openTime && entry.closeTime)
    .map((entry) => ({
      day: entry.day,
      startTime: entry.openTime,
      endTime: entry.closeTime,
    }))
}

/**
 * Resolves semantic UI node types to payload node types.
 *
 * @param {string | undefined} type
 * @returns {string}
 */
function resolveNodeType(type) {
  if (type === 'businessHours') {
    return 'dateTime'
  }

  return type ?? 'sendMessage'
}

/**
 * Derives a human-readable title from a raw payload node.
 * Falls back to the node type when no name is present.
 * @param {object} raw
 * @returns {string}
 */
function deriveTitle(raw) {
  if (raw.name) return raw.name
  switch (raw.type) {
    case 'trigger':
      return 'Trigger'
    case 'sendMessage':
      return 'Send Message'
    case 'addComment':
      return 'Add Comment'
    case 'dateTime':
      return 'Business Hours'
    case 'dateTimeConnector':
      return raw.data?.connectorType === 'success' ? 'Success' : 'Failure'
    default:
      return raw.type
  }
}

/**
 * Derives a short description string from a raw payload node.
 * @param {object} raw
 * @returns {string}
 */
function deriveDescription(raw) {
  switch (raw.type) {
    case 'sendMessage': {
      const textEntry = (raw.data?.payload ?? []).find((p) => p.type === 'text')
      return textEntry?.text ?? ''
    }
    case 'addComment':
      return raw.data?.comment ?? ''
    case 'dateTime':
      return `Timezone: ${raw.data?.timezone ?? 'UTC'}`
    case 'dateTimeConnector':
      return raw.data?.connectorType ?? ''
    case 'trigger':
      return raw.data?.type ?? ''
    default:
      return ''
  }
}

/**
 * Returns children ordered in a visually meaningful way.
 *
 * @param {object} node
 * @param {Map<string, object[]>} childrenByParent
 * @returns {object[]}
 */
function getNodeHeight(_node) {
  return NODE_HEIGHT
}

function layoutNodes(nodes) {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const childrenByParent = new Map()

  for (const node of nodes) {
    const parentId = node.data?.parentId
    if (parentId !== null && parentId !== '-1' && nodesById.has(String(parentId))) {
      if (!childrenByParent.has(String(parentId))) childrenByParent.set(String(parentId), [])
      childrenByParent.get(String(parentId)).push(node)
    }
  }

  const roots = nodes.filter((node) => {
    const parentId = node.data?.parentId
    return parentId === null || parentId === '-1' || !nodesById.has(String(parentId))
  })

  function getOrderedChildren(node) {
    const children = [...(childrenByParent.get(node.id) ?? [])]
    if (node.type === 'dateTime' && Array.isArray(node.data?.connectors)) {
      const connectorOrder = new Map(node.data.connectors.map((id, index) => [String(id), index]))
      return children.sort((a, b) => {
        const aOrder = connectorOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER
        const bOrder = connectorOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER
        return aOrder - bOrder
      })
    }
    return children
  }

  const subtreeWidth = new Map()

  function measure(node) {
    const children = getOrderedChildren(node)
    if (children.length === 0) {
      subtreeWidth.set(node.id, NODE_WIDTH)
      return NODE_WIDTH
    }
    const childrenSum = children.reduce((sum, c) => sum + measure(c), 0)
    const totalGaps = (children.length - 1) * H_GAP
    const w = Math.max(NODE_WIDTH, childrenSum + totalGaps)
    subtreeWidth.set(node.id, w)
    return w
  }

  for (const root of roots) measure(root)

  const positions = new Map()

  function place(node, slotLeft, y) {
    const slotW = subtreeWidth.get(node.id) ?? NODE_WIDTH
    const nodeW = node.type === 'dateTimeConnector' ? CONNECTOR_WIDTH : NODE_WIDTH
    const x = slotLeft + (slotW - nodeW) / 2
    positions.set(node.id, { x, y })

    const children = getOrderedChildren(node)
    if (children.length === 0) return

    const childY = y + getNodeHeight(node) + V_GAP
    const childrenTotalW = children.reduce((s, c) => s + (subtreeWidth.get(c.id) ?? NODE_WIDTH), 0)
    const childrenGaps = (children.length - 1) * H_GAP
    const childrenBlockW = childrenTotalW + childrenGaps
    let cursor = slotLeft + (slotW - childrenBlockW) / 2

    for (const child of children) {
      const cw = subtreeWidth.get(child.id) ?? NODE_WIDTH
      place(child, cursor, childY)
      cursor += cw + H_GAP
    }
  }

  let cursor = CANVAS_PADDING_X
  for (const root of roots) {
    place(root, cursor, CANVAS_PADDING_Y)
    cursor += (subtreeWidth.get(root.id) ?? NODE_WIDTH) + H_GAP * 3
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id) ?? node.position
    return { ...node, position: pos }
  })
}

/**
 * Maps a raw payload node to the normalised Vue Flow node shape.
 * @param {object} raw
 * @returns {object}
 */
function normaliseNode(raw) {
  const data = {
    parentId: raw.parentId !== undefined ? String(raw.parentId) : null,
    // Preserve all original type-specific fields so panels can use them
    ...raw.data,
  }

  if (raw.type === 'dateTime') {
    data.businessHours = normaliseBusinessHours(raw.data)
  }

  return {
    id: String(raw.id),
    type: raw.type,
    position: { x: CANVAS_PADDING_X, y: CANVAS_PADDING_Y },
    data: {
      title: deriveTitle(raw),
      description: deriveDescription(raw),
      ...data,
    },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches nodes from the remote URL on the first call; returns the cached
 * array on subsequent calls.
 * @returns {Promise<object[]>}
 */
export async function fetchNodes() {
  if (nodesCache !== null) {
    return delayed([...nodesCache])
  }

  const response = await fetch(PAYLOAD_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch nodes: ${response.status} ${response.statusText}`)
  }

  const rawNodes = await response.json()
  nodesCache = layoutNodes(rawNodes.map((raw) => normaliseNode(raw)))

  return delayed([...nodesCache])
}

/**
 * Creates a new node and appends it to the in-memory state.
 * @param {{ title: string, description?: string, type: string, [key: string]: any }} data
 * @returns {Promise<object>} The newly created node.
 */
export async function createNode(data) {
  // Ensure the cache is initialised before mutating
  if (nodesCache === null) {
    await fetchNodes()
  }

  const type = resolveNodeType(data.type)

  const baseData = {
    title: data.title ?? 'New Node',
    description: data.description ?? '',
    ...data,
    type,
  }

  if (type === 'dateTime') {
    baseData.businessHours = normaliseBusinessHours(baseData)
    baseData.times = denormaliseBusinessHours(baseData.businessHours)
  }

  const newNodeId = crypto.randomUUID()
  const newNode = {
    id: newNodeId,
    type,
    position: { x: 100, y: 100 },
    data: baseData,
  }

  if (type === 'dateTime') {
    const successId = crypto.randomUUID()
    const failureId = crypto.randomUUID()

    newNode.data.connectors = [successId, failureId]

    nodesCache.push(newNode)
    nodesCache.push({
      id: successId,
      type: 'dateTimeConnector',
      position: { x: 100, y: 100 },
      data: { parentId: newNodeId, connectorType: 'success', title: 'Success', description: 'success' },
    })
    nodesCache.push({
      id: failureId,
      type: 'dateTimeConnector',
      position: { x: 100, y: 100 },
      data: { parentId: newNodeId, connectorType: 'failure', title: 'Failure', description: 'failure' },
    })
  } else {
    nodesCache.push(newNode)
  }

  return delayed({ ...newNode })
}

/**
 * Updates a node's `data` field by merging the supplied patch.
 * @param {string} id
 * @param {object} patch  Fields to merge into the node's `data` object.
 * @returns {Promise<object>} The updated node.
 */
export async function updateNode(id, patch) {
  if (nodesCache === null) {
    await fetchNodes()
  }

  const index = nodesCache.findIndex((n) => n.id === String(id))
  if (index === -1) {
    throw new Error(`Node not found: ${id}`)
  }

  const nextData = {
    ...nodesCache[index].data,
    ...patch,
  }

  if (nodesCache[index].type === 'dateTime') {
    const businessHours = normaliseBusinessHours(nextData)
    nextData.businessHours = businessHours
    nextData.times = denormaliseBusinessHours(businessHours)
  }

  nodesCache[index] = {
    ...nodesCache[index],
    data: nextData,
  }

  return delayed({ ...nodesCache[index] })
}

/**
 * Removes a node and all its descendants from the in-memory state.
 * @param {string} id
 * @returns {Promise<string[]>} The ids of all deleted nodes.
 */
export async function deleteNode(id) {
  if (nodesCache === null) {
    await fetchNodes()
  }

  const rootId = String(id)

  // BFS to collect the root + all descendants
  const toRemove = new Set()
  const queue = [rootId]

  while (queue.length > 0) {
    const current = queue.shift()
    toRemove.add(current)

    for (const node of nodesCache) {
      const parentId = node.data?.parentId
      if (parentId && String(parentId) === current && !toRemove.has(node.id)) {
        queue.push(node.id)
      }
    }
  }

  if (!toRemove.has(rootId)) {
    throw new Error(`Node not found: ${id}`)
  }

  nodesCache = nodesCache.filter((n) => !toRemove.has(n.id))

  return delayed([...toRemove])
}

/**
 * Updates a node's `position` in the in-memory state.
 * @param {string} id
 * @param {{ x: number, y: number }} position
 * @returns {Promise<object>} The updated node.
 */
export async function updateNodePosition(id, position) {
  if (nodesCache === null) {
    await fetchNodes()
  }

  const index = nodesCache.findIndex((n) => n.id === String(id))
  if (index === -1) {
    throw new Error(`Node not found: ${id}`)
  }

  nodesCache[index] = {
    ...nodesCache[index],
    position: { ...position },
  }

  return delayed({ ...nodesCache[index] })
}

/**
 * Resets the in-memory cache. Useful for testing.
 * @returns {void}
 */
export function _resetCache() {
  nodesCache = null
}

/**
 * Re-runs the tree layout over the current cache and returns positioned nodes.
 * Call this after adding a node via drag-drop so the tree re-organises cleanly.
 * @returns {Promise<object[]>}
 */
export async function relayoutNodes() {
  if (nodesCache === null) {
    await fetchNodes()
  }
  nodesCache = layoutNodes([...nodesCache])
  return delayed([...nodesCache])
}

/**
 * Restores a set of previously deleted nodes back into the cache,
 * preserving their original positions and data. Used for undo of delete.
 * @param {object[]} nodesToRestore  Full node objects (as returned before deletion)
 * @returns {Promise<void>}
 */
export async function restoreNodes(nodesToRestore) {
  if (nodesCache === null) {
    await fetchNodes()
  }
  for (const node of nodesToRestore) {
    if (!nodesCache.find((n) => n.id === node.id)) {
      nodesCache.push({ ...node })
    }
  }
}
