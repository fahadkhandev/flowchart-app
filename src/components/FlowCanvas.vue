<script setup>
import { markRaw, nextTick, inject, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { useRouter } from 'vue-router'
import { useFlowchartStore } from '../stores/flowchartStore.js'
import { useHistoryStore } from '../stores/historyStore.js'
import { updateNodePosition, createNode, deleteNode as apiDeleteNode, relayoutNodes } from '../api/nodes.js'
import { NODE_TYPE_LABELS } from '../utils/nodeTypes.js'
import BaseNode from './BaseNode.vue'
import TreeEdge from './TreeEdge.vue'
import ConnectorChildEdge from './ConnectorChildEdge.vue'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/minimap/dist/style.css'

const router = useRouter()
const flowchartStore = useFlowchartStore()
const historyStore = useHistoryStore()
const dragStartPositions = new Map()
let hasFittedInitialView = false

const { zoomIn, zoomOut, fitView, screenToFlowCoordinate, nodesDraggable } = useVueFlow()
const locked = inject('locked', { value: false })

watch(() => locked.value, (isLocked) => {
  nodesDraggable.value = !isLocked
}, { immediate: true })

const nodeTypes = {
  sendMessage: markRaw(BaseNode),
  addComment: markRaw(BaseNode),
  dateTime: markRaw(BaseNode),
  dateTimeConnector: markRaw(BaseNode),
  trigger: markRaw(BaseNode),
}

const edgeTypes = {
  tree: markRaw(TreeEdge),
  connectorChild: markRaw(ConnectorChildEdge),
}

/**
 * Capture the pre-drag position before Vue Flow syncs the new position
 * into the bound store state.
 */
function onNodeDragStart({ node }) {
  dragStartPositions.set(node.id, { ...node.position })
}

/**
 * Handle node drag stop: persist position via API, push undo/redo command,
 * and keep the Pinia store in sync.
 */
async function onNodeDragStop({ node }) {
  const newPosition = { ...node.position }
  const previousPosition = dragStartPositions.get(node.id) ?? { ...newPosition }
  dragStartPositions.delete(node.id)

  if (locked.value || previousPosition.x === newPosition.x && previousPosition.y === newPosition.y) {
    return
  }

  // Persist to API (fire-and-forget; errors are non-blocking for UX)
  updateNodePosition(node.id, newPosition).catch((err) => {
    console.error('Failed to persist node position:', err)
  })

  // Push a reversible command to the history store
  historyStore.push({
    description: `Move node ${node.id}`,
    do: () => {
      flowchartStore.updateNodePosition(node.id, newPosition)
      updateNodePosition(node.id, newPosition).catch(console.error)
    },
    undo: () => {
      flowchartStore.updateNodePosition(node.id, previousPosition)
      updateNodePosition(node.id, previousPosition).catch(console.error)
    },
  })

  // Keep the Pinia store in sync with the dragged position
  flowchartStore.updateNodePosition(node.id, newPosition)
}

/**
 * Single click: select the node and open the details drawer.
 * Connector nodes are display-only and cannot be selected.
 */
function onNodeClick({ node }) {
  if (locked.value || node.type === 'dateTimeConnector') return
  flowchartStore.setSelectedNodeId(node.id)
  router.push({ name: 'node-detail', params: { id: node.id } })
}

/**
 * Clicking the empty canvas pane clears the selection.
 */
function onPaneClick() {
  flowchartStore.setSelectedNodeId(null)
}

/**
 * Allow drop on the canvas pane.
 */
function onDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

/**
 * Find the canvas node whose centre is closest to the given flow-space point.
 * Returns null when there are no nodes.
 */
function findNearestNode(flowPos) {
  let nearest = null
  let minDist = Infinity

  for (const node of flowchartStore.nodes) {
    // Approximate node centre (node position is top-left corner)
    const cx = node.position.x + 110  // half of NODE_WIDTH ≈ 220
    const cy = node.position.y + 50   // half of approx node height
    const dx = flowPos.x - cx
    const dy = flowPos.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < minDist) {
      minDist = dist
      nearest = node
    }
  }

  return nearest
}

/**
 * Handle a node block being dropped from the sidebar onto the canvas.
 * Creates the new node and connects it as a child of the nearest existing node.
 */
async function onDrop(event) {
  event.preventDefault()

  const nodeType = event.dataTransfer.getData('application/vueflow-node-type')
  if (!nodeType || locked.value) return

  // Convert screen drop position to Vue Flow canvas coordinates
  const flowPos = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })

  // Find the nearest node to connect as parent
  const parentNode = findNearestNode(flowPos)

  const newNodeData = {
    type: nodeType,
    title: NODE_TYPE_LABELS[nodeType] ?? 'New Node',
    description: '',
    parentId: parentNode ? parentNode.id : null,
  }

  try {
    const newNode = await createNode(newNodeData)

    // Re-run the full tree layout so the new node slots in cleanly
    const relaidOut = await relayoutNodes()
    flowchartStore.setNodes(relaidOut)

    const newNodeId = newNode.id
    historyStore.push({
      description: `Add ${nodeType} node`,
      do: async () => {
        await createNode(newNodeData)
        const fresh = await relayoutNodes()
        flowchartStore.setNodes(fresh)
      },
      undo: async () => {
        await apiDeleteNode(newNodeId)
        const fresh = await relayoutNodes()
        flowchartStore.setNodes(fresh)
      },
    })
  } catch (err) {
    console.error('Failed to create node from drop:', err)
  }
}

defineExpose({ zoomIn, zoomOut, fitView })

async function onNodesInitialized() {
  if (hasFittedInitialView || flowchartStore.nodes.length === 0) {
    return
  }

  hasFittedInitialView = true
  await nextTick()
  fitView({ padding: 0.18, duration: 500, maxZoom: 1 })
}
</script>

<template>
  <div
    style="width: 100%; height: 100%"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <VueFlow
      v-model:nodes="flowchartStore.nodes"
      v-model:edges="flowchartStore.edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :default-edge-options="{
        animated: false,
        type: 'tree',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      }"
      :fit-view-on-init="false"
      :min-zoom="0.4"
      :max-zoom="1.6"
      @node-drag-start="onNodeDragStart"
      @node-drag-stop="onNodeDragStop"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
      @nodes-initialized="onNodesInitialized"
    >
      <MiniMap />
    </VueFlow>
  </div>
</template>

<style scoped>
:deep(.vue-flow__pane) {
  background:
    radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.22) 1.2px, transparent 0) 0 0 / 22px 22px,
    linear-gradient(180deg, #fffaf7 0%, #ffffff 100%);
}

:deep(.vue-flow__edge-path) {
  stroke-linecap: round;
  stroke-linejoin: round;
}

</style>
