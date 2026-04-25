<script setup>
import { ref, computed, watch, nextTick, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { useFlowchartStore } from '../stores/flowchartStore.js'
import { useHistoryStore } from '../stores/historyStore.js'
import { updateNode as updateNodeApi, deleteNode as deleteNodeApi } from '../api/nodes.js'
import { NODE_TYPE_LABELS } from '../utils/nodeTypes.js'
import { validateRequired } from '../utils/validation.js'


const SendMessagePanel = defineAsyncComponent(() =>
  import('./panels/SendMessagePanel.vue').catch(() => ({ template: '<div></div>' }))
)

const BusinessHoursPanel = defineAsyncComponent(() =>
  import('./panels/BusinessHoursPanel.vue').catch(() => ({ template: '<div></div>' }))
)
const DisplayOnlyPanel = defineAsyncComponent(() =>
  import('./panels/DisplayOnlyPanel.vue').catch(() => ({ template: '<div></div>' }))
)

// ---------------------------------------------------------------------------
// Composables
// ---------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const flowchartStore = useFlowchartStore()
const historyStore = useHistoryStore()

// ---------------------------------------------------------------------------
// Drawer state
// ---------------------------------------------------------------------------
const isOpen = ref(false)
const node = ref(null)

// Form state
const titleValue = ref('')
const descriptionValue = ref('')
const titleError = ref(null)
const showDeleteConfirm = ref(false)

// Refs for focus management
const drawerRef = ref(null)
const firstFocusableRef = ref(null)

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const typeLabel = computed(() => node.value ? (NODE_TYPE_LABELS[node.value.type] ?? node.value.type) : '')

const isRoot = computed(() => {
  const pid = node.value?.data?.parentId
  return pid === null || pid === '-1'
})

const panelComponent = computed(() => {
  if (!node.value) return null
  switch (node.value.type) {
    case 'sendMessage': return SendMessagePanel
    case 'dateTime': return BusinessHoursPanel
    case 'trigger':
    case 'dateTimeConnector': return DisplayOnlyPanel
    default: return null
  }
})

const isUnchanged = computed(() => {
  if (!node.value) return true
  return (
    titleValue.value === (node.value.data?.title ?? '') &&
    descriptionValue.value === (node.value.data?.description ?? '')
  )
})

const isSaveDisabled = computed(() => {
  return !!titleError.value || isUnchanged.value || isSaving.value
})

const attachments = computed(() => {
  const payload = node.value?.data?.payload ?? []

  return payload.filter((item) => item.type !== 'text')
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
const { mutate: saveNode, isPending: isSaving } = useMutation({
  mutationFn: ({ id, patch }) => updateNodeApi(id, patch),
})

const { mutate: removeNode, isPending: isDeleting } = useMutation({
  mutationFn: (id) => deleteNodeApi(id),
  onSuccess: () => {
    // removeNode in the store already cascades — just navigate away
    router.push('/')
  },
})

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------
function syncDrawerState(id) {
  if (!id) {
    isOpen.value = false
    node.value = null
    showDeleteConfirm.value = false
    return
  }

  const found = flowchartStore.getNodeById(id)
  if (!found) {
    isOpen.value = false
    node.value = null
    return
  }

  if (found.type === 'dateTimeConnector') {
    isOpen.value = false
    node.value = null
    showDeleteConfirm.value = false
    router.replace('/')
    return
  }

  node.value = found
  titleValue.value = found.data?.title ?? ''
  descriptionValue.value = found.data?.description ?? ''
  titleError.value = null
  showDeleteConfirm.value = false
  isOpen.value = true

  nextTick(() => {
    if (firstFocusableRef.value) {
      firstFocusableRef.value.focus()
    }
  })
}

watch(
  [() => route.params.id, () => flowchartStore.nodes],
  ([id]) => {
    syncDrawerState(id)
  },
  { immediate: true, deep: true }
)

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------
function close() {
  router.push('/')
}

function onTitleInput(e) {
  titleValue.value = e.target.value
  titleError.value = validateRequired(e.target.value)
}

function onSave() {
  const err = validateRequired(titleValue.value)
  if (err) {
    titleError.value = err
    return
  }

  const id = node.value.id
  const newData = {
    title: titleValue.value,
    description: descriptionValue.value,
  }
  const previousData = {
    title: node.value.data?.title ?? '',
    description: node.value.data?.description ?? '',
  }

  historyStore.push({
    description: `Edit node ${id}`,
    do: () => {
      flowchartStore.updateNode(id, newData)
      saveNode({ id, patch: newData })
    },
    undo: () => {
      flowchartStore.updateNode(id, previousData)
      saveNode({ id, patch: previousData })
    },
  })

  // Execute the do action immediately
  flowchartStore.updateNode(id, newData)
  saveNode({ id, patch: newData })
}

function onDeleteClick() {
  showDeleteConfirm.value = true
}

function onDeleteCancel() {
  showDeleteConfirm.value = false
}

function onDeleteConfirm() {
  if (!node.value) return
  const id = node.value.id
  // Remove from store immediately (cascades to all descendants)
  flowchartStore.removeNode(id)
  // Fire API delete in background (also cascades in cache)
  removeNode(id)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    close()
  }
}

function onBackdropClick() {
  close()
}

function attachmentLabel(item) {
  return item.filename ?? item.attachment ?? item.originalUrl ?? 'Attachment'
}

function attachmentUrl(item) {
  return item.attachment ?? item.originalUrl ?? item.previewUrl ?? null
}

function isImageAttachment(item) {
  if (item.mimeType && item.mimeType.startsWith('image/')) return true
  const url = item.attachment ?? item.originalUrl ?? item.previewUrl ?? ''
  return /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i.test(url)
}
</script>

<template>
  <!-- Backdrop -->
  <Transition name="backdrop-fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/30 z-30"
      aria-hidden="true"
      @click="onBackdropClick"
    />
  </Transition>

  <!-- Drawer panel -->
  <div
    ref="drawerRef"
    role="complementary"
    aria-label="Node details"
    class="fixed top-0 right-0 h-full w-96 max-w-full bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.15)] z-40 flex flex-col transition-transform duration-300 ease-in-out"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
    @keydown="onKeydown"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <h2 class="text-base font-semibold text-gray-900 truncate">
          {{ node?.data?.title ?? 'Node Details' }}
        </h2>
        <span
          v-if="node"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 shrink-0"
        >
          {{ typeLabel }}
        </span>
      </div>
      <button
        ref="firstFocusableRef"
        type="button"
        class="ml-2 p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        aria-label="Close drawer"
        @click="close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Scrollable body -->
    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      <template v-if="node">
        <!-- Core editable fields -->
        <div>
          <label for="drawer-title" class="block text-sm font-medium text-gray-700 mb-1">
            Title <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="drawer-title"
            type="text"
            :value="titleValue"
            class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            :class="titleError ? 'border-red-400 bg-red-50' : 'border-gray-300'"
            aria-required="true"
            :aria-invalid="!!titleError"
            :aria-describedby="titleError ? 'drawer-title-error' : undefined"
            @input="onTitleInput"
          />
          <p
            v-if="titleError"
            id="drawer-title-error"
            class="mt-1 text-xs text-red-600"
            role="alert"
          >
            {{ titleError }}
          </p>
        </div>

        <div>
          <label for="drawer-description" class="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="drawer-description"
            v-model="descriptionValue"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
          />
        </div>

        <button
          type="button"
          class="w-full py-2 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          :class="isSaveDisabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'"
          :disabled="isSaveDisabled"
          :aria-busy="isSaving"
          @click="onSave"
        >
          {{ isSaving ? 'Saving…' : 'Save' }}
        </button>

        <section
          v-if="attachments.length"
          aria-labelledby="drawer-attachments-heading"
          class="space-y-3"
        >
          <h3
            id="drawer-attachments-heading"
            class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Attachments
          </h3>

          <div class="space-y-2">
            <div
              v-for="(item, index) in attachments"
              :key="`${attachmentLabel(item)}-${index}`"
              class="rounded-md border border-gray-200 bg-gray-50 overflow-hidden"
            >
              <!-- Image preview -->
              <img
                v-if="isImageAttachment(item)"
                :src="attachmentUrl(item)"
                :alt="attachmentLabel(item)"
                class="w-full max-h-48 object-cover"
              />
              <!-- Non-image: show label + link -->
              <div v-else class="px-3 py-2">
                <p class="text-sm font-medium text-gray-800 break-all">
                  {{ attachmentLabel(item) }}
                </p>
              </div>
              <!-- Link below preview -->
              <div v-if="attachmentUrl(item)" class="px-3 py-1.5 border-t border-gray-100">
                <a
                  :href="attachmentUrl(item)"
                  target="_blank"
                  rel="noreferrer"
                  class="text-xs text-blue-600 hover:text-blue-700 break-all"
                >
                  Open original ↗
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Divider -->
        <hr class="border-gray-200" />

        <!-- Type-specific panel -->
        <Suspense v-if="panelComponent">
          <component :is="panelComponent" :node="node" />
          <template #fallback>
            <div class="h-8 flex items-center justify-center text-xs text-gray-400">Loading panel…</div>
          </template>
        </Suspense>
      </template>

      <!-- Empty state (no node loaded yet) -->
      <template v-else>
        <p class="text-sm text-gray-400 text-center py-8">No node selected.</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 300ms ease-in-out;
}
.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}
</style>
