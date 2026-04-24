<script setup>
import { computed, inject, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { getNodeIcon, getNodeTypeColor, NODE_TYPE_LABELS, isDisplayOnly } from '../utils/nodeTypes.js'
import { useFlowchartStore } from '../stores/flowchartStore.js'
import { storeToRefs } from 'pinia'
import { useHistoryStore } from '../stores/historyStore.js'
import { createNode, deleteNode as apiDeleteNode, restoreNodes, relayoutNodes } from '../api/nodes.js'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  type: { type: String, required: true },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const flowchartStore = useFlowchartStore()
const historyStore = useHistoryStore()
const locked = inject('locked', { value: false })
const { selectedNodeId } = storeToRefs(flowchartStore)
const isSelected = computed(() => selectedNodeId.value === props.id)

const isHovered = ref(false)
const isAddingChild = ref(false)
const isDeleting = ref(false)
const showTypeSelector = ref(false)

const ADDABLE_TYPES = [
  { type: 'sendMessage', label: NODE_TYPE_LABELS.sendMessage },
  { type: 'addComment', label: NODE_TYPE_LABELS.addComment },
  { type: 'dateTime', label: NODE_TYPE_LABELS.dateTime },
]

const isConnectorNode = computed(() => props.type === 'dateTimeConnector')
const isTriggerNode = computed(() => props.type === 'trigger')
const isRoot = computed(() => {
  const pid = props.data.parentId
  return pid === null || pid === '-1'
})
const canDelete = computed(() => !isRoot.value && !isConnectorNode.value)
const childCount = computed(() =>
  flowchartStore.nodes.filter((n) => n.data?.parentId === props.id).length
)
const canAddChild = computed(() => {
  if (props.type === 'dateTime') return false
  if (isConnectorNode.value && childCount.value >= 1) return false
  return true
})
const showToolbar = computed(() => !locked.value && (isHovered.value || props.selected))

function isInteractiveNode(type) {
  return type !== 'dateTimeConnector'
}

function handleActivate() {
  if (!isInteractiveNode(props.type) || locked.value) return
  emit('select', props.id)
}

function onMouseLeave() {
  isHovered.value = false
  showTypeSelector.value = false
}

async function handleAddChild(nodeType) {
  showTypeSelector.value = false
  if (isAddingChild.value) return
  isAddingChild.value = true
  try {
    const newNode = await createNode({
      type: nodeType,
      title: NODE_TYPE_LABELS[nodeType] ?? 'New Node',
      description: '',
      parentId: props.id,
    })
    const relaidOut = await relayoutNodes()
    flowchartStore.setNodes(relaidOut)

    const newNodeId = newNode.id
    historyStore.push({
      description: `Add ${nodeType} node`,
      do: async () => {
        await createNode({
          type: nodeType,
          title: NODE_TYPE_LABELS[nodeType] ?? 'New Node',
          description: '',
          parentId: props.id,
        })
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
    console.error('Failed to add child node:', err)
  } finally {
    isAddingChild.value = false
  }
}

async function handleDelete() {
  if (isDeleting.value) return
  isDeleting.value = true
  try {
    // Snapshot the node + all its descendants before deletion for undo
    const deletedIds = new Set()
    const queue = [props.id]
    while (queue.length) {
      const cur = queue.shift()
      deletedIds.add(cur)
      flowchartStore.nodes
        .filter((n) => n.data?.parentId === cur)
        .forEach((n) => queue.push(n.id))
    }
    const snapshots = flowchartStore.nodes
      .filter((n) => deletedIds.has(n.id))
      .map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } }))

    await apiDeleteNode(props.id)
    const relaidOut = await relayoutNodes()
    flowchartStore.setNodes(relaidOut)

    historyStore.push({
      description: `Delete node ${props.id}`,
      do: async () => {
        await apiDeleteNode(props.id)
        const fresh = await relayoutNodes()
        flowchartStore.setNodes(fresh)
      },
      undo: async () => {
        await restoreNodes(snapshots)
        const fresh = await relayoutNodes()
        flowchartStore.setNodes(fresh)
      },
    })
  } catch (err) {
    console.error('Failed to delete node:', err)
    isDeleting.value = false
  }
}
</script>

<template>
  <div
    :class="[
      'relative select-none transition-[box-shadow,transform,border-color] duration-200',
      'focus:ring-2 focus:ring-blue-500 focus:outline-none',
      isInteractiveNode(type) ? 'cursor-pointer' : 'cursor-default',
      isConnectorNode
        ? 'w-[110px] rounded-full border px-3 py-2 shadow-sm'
        : 'w-[260px] rounded-2xl border-2 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)]',
      getNodeTypeColor(type, data.connectorType),
      isSelected && !isConnectorNode ? 'ring-2 ring-blue-500 ring-offset-2' : '',
      isDisplayOnly(type) ? 'opacity-80' : 'hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]',
    ]"
    :tabindex="isInteractiveNode(type) ? 0 : -1"
    :role="isInteractiveNode(type) ? 'button' : 'img'"
    :aria-label="isInteractiveNode(type) ? `Open details for ${data.title}` : `${data.title} connector`"
    @mouseenter="isHovered = true"
    @mouseleave="onMouseLeave"
    @keydown.enter.prevent="handleActivate"
    @keydown.space.prevent="handleActivate"
  >
    <!-- Connection handles -->
    <Handle type="target" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />

    <!-- Toolbar + type selector container (floats above the node) -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="showToolbar"
        class="nodrag absolute left-1/2 z-50 flex flex-col items-center gap-1 pb-2"
        style="bottom: 100%; transform: translateX(-50%);"
        @mouseenter="isHovered = true"
        @mouseleave="onMouseLeave"
        @click.stop
        @mousedown.stop
      >
        <!-- Node type picker (shows above toolbar when + is clicked) -->
        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          enter-from-class="opacity-0 scale-95 -translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-100 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 -translate-y-1"
        >
          <div
            v-if="canAddChild && showTypeSelector"
            class="w-44 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          >
            <button
              v-for="item in ADDABLE_TYPES"
              :key="item.type"
              class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors focus:outline-none"
              :disabled="isAddingChild"
              @click="handleAddChild(item.type)"
            >
              <svg class="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true">
                <use :href="`/icons.svg#${getNodeIcon(item.type)}`" />
              </svg>
              {{ item.label }}
            </button>
          </div>
        </Transition>

        <!-- Action buttons -->
        <div class="flex items-center bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <!-- Add child — toggles the type picker (hidden for Business Hours) -->
          <button
            v-if="canAddChild"
            class="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors focus:outline-none"
            :class="{ 'opacity-50 cursor-not-allowed': isAddingChild, 'bg-green-50 text-green-600': showTypeSelector }"
            title="Add child node"
            :disabled="isAddingChild"
            @click="showTypeSelector = !showTypeSelector"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <!-- Delete — hidden for root and connector nodes -->
          <button
            v-if="canDelete"
            class="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none border-l border-gray-200"
            :class="{ 'opacity-50 cursor-not-allowed': isDeleting }"
            title="Delete node"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Node content -->
    <div :class="isConnectorNode ? 'flex items-center justify-center gap-2' : 'flex items-start gap-2'">
      <svg
        :class="isConnectorNode ? 'h-4 w-4 flex-shrink-0' : 'mt-0.5 h-5 w-5 flex-shrink-0'"
        aria-hidden="true"
      >
        <use :href="`/icons.svg#${getNodeIcon(type)}`" />
      </svg>

      <div class="flex-1 min-w-0">
        <div v-if="!isConnectorNode" class="mb-1 flex items-center gap-1.5">
          <span class="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-white/60 text-gray-600 border border-gray-200">
            {{ NODE_TYPE_LABELS[type] ?? type }}
          </span>
          <span
            v-if="isDisplayOnly(type)"
            class="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500"
          >
            read-only
          </span>
        </div>

        <p
          :class="[
            'leading-tight break-words text-gray-800',
            isConnectorNode ? 'text-center text-xs font-semibold' : 'text-sm font-bold',
            isTriggerNode ? 'text-center' : '',
          ]"
        >
          {{ data.title }}
        </p>

        <p
          v-if="data.description && !isConnectorNode"
          class="mt-1 text-xs leading-snug text-gray-500 truncate"
        >
          {{ data.description }}
        </p>
      </div>
    </div>
  </div>
</template>
