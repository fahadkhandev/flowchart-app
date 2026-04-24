<script setup>
import { ref, computed, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { useFlowchartStore } from '../../stores/flowchartStore.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { updateNode as updateNodeApi } from '../../api/nodes.js'
import { validateFileType, validateFileSize } from '../../utils/validation.js'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_FILE_SIZE = 10485760 // 10 MB

// ---------------------------------------------------------------------------
// Store & mutation
// ---------------------------------------------------------------------------
const flowchartStore = useFlowchartStore()
const historyStore = useHistoryStore()

const { mutate: save, isPending } = useMutation({
  mutationFn: ({ id, patch }) => updateNodeApi(id, patch),
})

// ---------------------------------------------------------------------------
// Local state — derived from node.data.payload
// ---------------------------------------------------------------------------

/**
 * Deep-clone the payload from props so we can edit locally without mutating
 * the store directly.
 */
function clonePayload() {
  return (props.node?.data?.payload ?? []).map((item) => ({ ...item }))
}

function clonePayloadList(payload = []) {
  return payload.map((item) => ({ ...item }))
}

const localPayload = ref(clonePayload())

// Keep local state in sync when the node prop changes (e.g. external update)
watch(
  () => props.node?.data?.payload,
  () => {
    localPayload.value = clonePayload()
  },
  { deep: true }
)

// ---------------------------------------------------------------------------
// Computed slices
// ---------------------------------------------------------------------------
const textEntries = computed(() =>
  localPayload.value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === 'text')
)

const attachments = computed(() =>
  localPayload.value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type !== 'text')
)

// ---------------------------------------------------------------------------
// File upload state
// ---------------------------------------------------------------------------
const fileInput = ref(null)
const fileErrors = ref([])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function persistPayload(newPayload) {
  const payload = clonePayloadList(newPayload)

  localPayload.value = payload
  flowchartStore.updateNode(props.node.id, { payload })
  save({
    id: props.node.id,
    patch: { payload },
  })
}

function commitPayloadChange(newPayload, description) {
  const previousPayload = clonePayload()
  const nextPayload = clonePayloadList(newPayload)

  historyStore.push({
    description,
    do: () => persistPayload(nextPayload),
    undo: () => persistPayload(previousPayload),
  })

  persistPayload(nextPayload)
}

// ---------------------------------------------------------------------------
// Text entry actions
// ---------------------------------------------------------------------------
function onTextInput(index, event) {
  localPayload.value[index] = { ...localPayload.value[index], text: event.target.value }
}

function saveTextEntry(index) {
  commitPayloadChange(localPayload.value, `Update message text ${props.node.id}:${index}`)
}

function removeTextEntry(index) {
  const updated = localPayload.value.filter((_, i) => i !== index)
  commitPayloadChange(updated, `Remove message text ${props.node.id}:${index}`)
}

function addTextEntry() {
  const updated = [...localPayload.value, { type: 'text', text: '' }]
  commitPayloadChange(updated, `Add message text ${props.node.id}`)
}

// ---------------------------------------------------------------------------
// Attachment actions
// ---------------------------------------------------------------------------
function removeAttachment(index) {
  const updated = localPayload.value.filter((_, i) => i !== index)
  commitPayloadChange(updated, `Remove attachment ${props.node.id}:${index}`)
}

function triggerFileInput() {
  fileInput.value?.click()
}

function onFilesSelected(event) {
  fileErrors.value = []
  const files = Array.from(event.target.files ?? [])
  if (!files.length) return

  const newAttachments = []

  for (const file of files) {
    const typeError = validateFileType(file, ALLOWED_MIME_TYPES)
    const sizeError = validateFileSize(file, MAX_FILE_SIZE)

    if (typeError || sizeError) {
      fileErrors.value.push(`${file.name}: ${typeError ?? sizeError}`)
      continue
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    newAttachments.push({
      type: file.type.startsWith('image/') ? 'image' : 'file',
      originalUrl: previewUrl ?? '',
      previewUrl,
      filename: file.name,
      mimeType: file.type,
    })
  }

  if (newAttachments.length) {
    const updated = [...localPayload.value, ...newAttachments]
    commitPayloadChange(updated, `Add attachments ${props.node.id}`)
  }

  // Reset input so the same file can be re-selected if needed
  event.target.value = ''
}

// ---------------------------------------------------------------------------
// Attachment display helpers
// ---------------------------------------------------------------------------
function attachmentLabel(item) {
  return item.filename ?? item.originalUrl ?? item.attachment ?? 'Attachment'
}

/**
 * Returns the best available image URL for preview.
 * Handles both locally uploaded files (previewUrl) and API attachments (attachment/originalUrl).
 */
function getImageUrl(item) {
  return item.previewUrl ?? item.attachment ?? item.originalUrl ?? null
}

/**
 * Detects if an attachment item should be previewed as an image.
 * Covers: locally uploaded images, API attachment URLs ending in image extensions.
 */
function isImage(item) {
  if (item.type === 'image') return true
  if (item.mimeType && item.mimeType.startsWith('image/')) return true
  // Detect image URLs from the API (type: 'attachment' with image URL)
  const url = item.attachment ?? item.originalUrl ?? item.previewUrl ?? ''
  return /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i.test(url)
}
</script>

<template>
  <div class="space-y-6">
    <!-- ------------------------------------------------------------------ -->
    <!-- Message Text section                                                -->
    <!-- ------------------------------------------------------------------ -->
    <section aria-labelledby="msg-text-heading">
      <h3
        id="msg-text-heading"
        class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3"
      >
        Message Text
      </h3>

      <div class="space-y-3">
        <!-- Existing text entries -->
        <div
          v-for="{ item, index } in textEntries"
          :key="index"
          class="space-y-1"
        >
          <textarea
            :value="item.text"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            :aria-label="`Message text ${index + 1}`"
            @input="onTextInput(index, $event)"
          />
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-1.5 px-3 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              :disabled="isPending"
              :aria-busy="isPending"
              @click="saveTextEntry(index)"
            >
              {{ isPending ? 'Saving…' : 'Save' }}
            </button>
            <button
              type="button"
              class="py-1.5 px-3 rounded text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
              :aria-label="`Remove text entry ${index + 1}`"
              @click="removeTextEntry(index)"
            >
              Remove
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <p
          v-if="textEntries.length === 0"
          class="text-sm text-gray-400 italic"
        >
          No text messages yet.
        </p>

        <!-- Add text button -->
        <button
          type="button"
          class="w-full py-2 px-4 rounded-md text-sm font-medium border border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="addTextEntry"
        >
          + Add text
        </button>
      </div>
    </section>

    <!-- ------------------------------------------------------------------ -->
    <!-- Attachments section                                                 -->
    <!-- ------------------------------------------------------------------ -->
    <section aria-labelledby="attachments-heading">
      <h3
        id="attachments-heading"
        class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3"
      >
        Attachments
      </h3>

      <!-- Attachment tiles -->
      <div
        v-if="attachments.length"
        class="flex flex-wrap gap-3 mb-3"
      >
        <div
          v-for="{ item, index } in attachments"
          :key="index"
          class="relative flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 bg-gray-50"
          style="width: 120px;"
        >
          <!-- Remove button -->
          <button
            type="button"
            class="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            :aria-label="`Remove attachment ${attachmentLabel(item)}`"
            @click="removeAttachment(index)"
          >
            ×
          </button>

          <!-- Preview or icon -->
          <div class="w-16 h-16 flex items-center justify-center overflow-hidden rounded">
            <img
              v-if="isImage(item)"
              :src="getImageUrl(item)"
              :alt="attachmentLabel(item)"
              class="w-full h-full object-cover rounded"
            />
            <!-- Generic file icon -->
            <svg
              v-else
              class="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          <!-- Filename / URL label -->
          <p
            class="w-full text-center text-xs text-gray-600 truncate leading-tight"
            :title="attachmentLabel(item)"
          >
            {{ attachmentLabel(item) }}
          </p>
        </div>
      </div>

      <!-- File validation errors -->
      <div
        v-if="fileErrors.length"
        class="mb-3 space-y-1"
        role="alert"
      >
        <p
          v-for="(err, i) in fileErrors"
          :key="i"
          class="text-xs text-red-600"
        >
          {{ err }}
        </p>
      </div>

      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        class="sr-only"
        aria-hidden="true"
        @change="onFilesSelected"
      />

      <!-- Upload zone button -->
      <button
        type="button"
        class="w-full py-4 px-4 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex flex-col items-center gap-1"
        @click="triggerFileInput"
      >
        <!-- Upload icon -->
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>Upload files</span>
        <span class="text-xs text-gray-400">Images, PDF, DOC · max 10 MB</span>
      </button>
    </section>
  </div>
</template>
