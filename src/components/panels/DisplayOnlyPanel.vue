<script setup>
import { NODE_TYPE_LABELS } from '../../utils/nodeTypes.js'

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
// Helpers
// ---------------------------------------------------------------------------
const typeLabel = NODE_TYPE_LABELS[props.node?.type] ?? props.node?.type ?? 'Unknown'
</script>

<template>
  <div class="space-y-4">
    <!-- Read-only notice -->
    <div
      class="flex items-center gap-2 rounded-md bg-gray-100 border border-gray-200 px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <!-- Lock icon -->
      <svg
        class="w-4 h-4 text-gray-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span class="text-xs text-gray-500 italic">Additional properties for this node are read-only.</span>
    </div>

    <!-- Node details -->
    <section aria-labelledby="display-only-heading">
      <h3
        id="display-only-heading"
        class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"
      >
        Node Details
      </h3>

      <dl class="space-y-3">
        <!-- Type -->
        <div>
          <dt class="text-xs font-medium text-gray-400 mb-0.5">Type</dt>
          <dd class="text-sm text-gray-500">{{ typeLabel }}</dd>
        </div>

        <!-- Title -->
        <div>
          <dt class="text-xs font-medium text-gray-400 mb-0.5">Title</dt>
          <dd class="text-sm text-gray-500">{{ node.data?.title ?? '—' }}</dd>
        </div>

        <!-- Description -->
        <div v-if="node.data?.description">
          <dt class="text-xs font-medium text-gray-400 mb-0.5">Description</dt>
          <dd class="text-sm text-gray-500 whitespace-pre-wrap">{{ node.data.description }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
