<script setup>
import { ref, computed, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { useFlowchartStore } from '../../stores/flowchartStore.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { updateNode as updateNodeApi } from '../../api/nodes.js'

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
// Store & mutation
// ---------------------------------------------------------------------------
const flowchartStore = useFlowchartStore()
const historyStore = useHistoryStore()

const { mutate: save, isPending } = useMutation({
  mutationFn: ({ id, patch }) => updateNodeApi(id, patch),
})

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------
const localComment = ref(props.node?.data?.comment ?? '')

// Keep local state in sync when the node prop changes (e.g. external update)
watch(
  () => props.node?.data?.comment,
  (newVal) => {
    localComment.value = newVal ?? ''
  }
)

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const isUnchanged = computed(() => localComment.value === (props.node?.data?.comment ?? ''))

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function applyComment(comment) {
  localComment.value = comment
  flowchartStore.updateNode(props.node.id, { comment })
  save({
    id: props.node.id,
    patch: { comment },
  })
}

function onSave() {
  const previousComment = props.node?.data?.comment ?? ''
  const nextComment = localComment.value

  historyStore.push({
    description: `Update comment ${props.node.id}`,
    do: () => applyComment(nextComment),
    undo: () => applyComment(previousComment),
  })

  applyComment(nextComment)
}

function onClear() {
  const previousComment = props.node?.data?.comment ?? ''

  historyStore.push({
    description: `Clear comment ${props.node.id}`,
    do: () => applyComment(''),
    undo: () => applyComment(previousComment),
  })

  applyComment('')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Section header -->
    <section aria-labelledby="comment-heading">
      <h3
        id="comment-heading"
        class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3"
      >
        Comment
      </h3>

      <!-- Textarea -->
      <textarea
        v-model="localComment"
        rows="5"
        placeholder="Enter a comment…"
        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
        aria-label="Comment text"
      />

      <!-- Actions -->
      <div class="flex gap-2 mt-3">
        <button
          type="button"
          class="flex-1 py-1.5 px-3 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          :disabled="isUnchanged || isPending"
          :aria-busy="isPending"
          @click="onSave"
        >
          {{ isPending ? 'Saving…' : 'Save' }}
        </button>

        <button
          type="button"
          class="py-1.5 px-3 rounded text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          :disabled="isPending"
          @click="onClear"
        >
          Clear
        </button>
      </div>
    </section>
  </div>
</template>
