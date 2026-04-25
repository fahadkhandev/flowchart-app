<script setup>
import { getNodeTypeColor, NODE_TYPE_LABELS, getNodeIconComponent } from '../utils/nodeTypes.js'

defineProps({
  open: { type: Boolean, default: true },
})
defineEmits(['toggle'])

const SIDEBAR_NODES = [
  {
    type: 'sendMessage',
    label: NODE_TYPE_LABELS.sendMessage,
    description: 'Send a message to the contact',
  },
  {
    type: 'addComment',
    label: NODE_TYPE_LABELS.addComment,
    description: 'Add an internal comment',
  },
  {
    type: 'dateTime',
    label: NODE_TYPE_LABELS.dateTime,
    description: 'Route by business hours',
  },
]

function onDragStart(event, nodeType) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/vueflow-node-type', nodeType)
}
</script>

<template>
  <aside
    class="relative flex flex-col shrink-0 h-full bg-white border-r border-gray-200 shadow-sm z-10 transition-[width] duration-300 ease-in-out overflow-hidden"
    :class="open ? 'w-56' : 'w-10'"
    aria-label="Node blocks"
  >
    <!-- Collapsed state: just the expand button -->
    <div v-if="!open" class="flex flex-col items-center pt-3">
      <button
        class="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        title="Expand sidebar"
        aria-label="Expand sidebar"
        @click="$emit('toggle')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Open state: full sidebar -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blocks</h2>
        <button
          class="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          @click="$emit('toggle')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <!-- Draggable node cards -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <div
          v-for="item in SIDEBAR_NODES"
          :key="item.type"
          draggable="true"
          class="flex items-start gap-3 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing select-none transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 bg-white"
          :class="getNodeTypeColor(item.type)"
          :aria-label="`Drag to add ${item.label} node`"
          @dragstart="onDragStart($event, item.type)"
        >
          <!-- Icon -->
          <div class="mt-0.5 shrink-0">
            <component
              :is="getNodeIconComponent(item.type)"
              v-if="getNodeIconComponent(item.type)"
              class="h-5 w-5 text-gray-600"
              aria-hidden="true"
            />
          </div>

          <!-- Text -->
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-800 leading-tight">{{ item.label }}</p>
            <p class="mt-0.5 text-xs text-gray-500 leading-snug">{{ item.description }}</p>
          </div>

          <!-- Drag handle hint -->
          <div class="ml-auto shrink-0 text-gray-300 mt-0.5" aria-hidden="true">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Footer hint -->
      <div class="px-4 py-3 border-t border-gray-100">
        <p class="text-xs text-gray-400 text-center leading-snug">
          Drag a block onto the canvas to add it
        </p>
      </div>
    </template>
  </aside>
</template>
