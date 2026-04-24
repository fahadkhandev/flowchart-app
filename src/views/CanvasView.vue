<script setup>
import { ref, watch, provide } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchNodes } from '../api/nodes.js'
import { useFlowchartStore } from '../stores/flowchartStore.js'
import FlowCanvas from '../components/FlowCanvas.vue'
import CanvasToolbar from '../components/CanvasToolbar.vue'
import CreateNodeModal from '../components/CreateNodeModal.vue'
import DetailsDrawer from '../components/DetailsDrawer.vue'

const flowchartStore = useFlowchartStore()

const showCreateModal = ref(false)
const sidebarOpen = ref(true)
const flowCanvasRef = ref(null)
const locked = ref(false)

provide('zoomIn', () => flowCanvasRef.value?.zoomIn?.())
provide('zoomOut', () => flowCanvasRef.value?.zoomOut?.())
provide('fitView', () => flowCanvasRef.value?.fitView?.())
provide('locked', locked)
provide('toggleLock', () => { locked.value = !locked.value })

const { data: nodesData, isLoading, isError } = useQuery({
  queryKey: ['nodes'],
  queryFn: fetchNodes,
})

watch(
  nodesData,
  (value) => {
    if (value) {
      flowchartStore.setNodes(value)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex w-full h-screen overflow-hidden">
    
    
    <!-- Main canvas area -->
    <div class="relative flex-1 h-full overflow-hidden">
      <!-- Loading state -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-gray-50 z-10"
      >
        <div class="flex flex-col items-center gap-3 text-gray-500">
          <svg
            class="h-8 w-8 animate-spin text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span class="text-sm font-medium">Loading…</span>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="isError"
        class="absolute inset-0 flex items-center justify-center bg-gray-50 z-10"
      >
        <div class="flex flex-col items-center gap-3 text-center px-4">
          <svg
            class="h-10 w-10 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
          </svg>
          <p class="text-sm font-medium text-gray-700">Failed to load nodes</p>
          <p class="text-xs text-gray-500">Please check your connection and try again.</p>
        </div>
      </div>

      <!-- Canvas -->
      <template v-else>
        <Transition
          enter-active-class="transition-opacity duration-200 ease-in"
          enter-from-class="opacity-0"
          appear
        >
          <div class="w-full h-full">
            <FlowCanvas ref="flowCanvasRef" />
          </div>
        </Transition>
        <CanvasToolbar @open-create-modal="showCreateModal = true" />
      </template>

      <!-- Always rendered — visibility driven internally -->
      <DetailsDrawer />
      <CreateNodeModal v-model="showCreateModal" />
    </div>
  </div>
</template>
