<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @keydown.esc="close"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          aria-hidden="true"
          @click="close"
        />

        <!-- Modal card -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          leave-active-class="transition duration-150 ease-in"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
          appear
        >
          <div
            v-if="modelValue"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            class="relative w-full max-w-[480px] rounded-xl bg-white shadow-2xl"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200">
              <h2 :id="titleId" class="text-lg font-semibold text-gray-900">
                Create New Node
              </h2>
              <button
                ref="closeButtonRef"
                type="button"
                aria-label="Close modal"
                class="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="close"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <!-- Form -->
            <form class="px-6 py-5 space-y-5" novalidate @submit.prevent="handleSubmit">
              <!-- Title field -->
              <div>
                <label for="node-title" class="block text-sm font-medium text-gray-700 mb-1">
                  Title <span class="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="node-title"
                  ref="titleInputRef"
                  v-model="form.title"
                  type="text"
                  autocomplete="off"
                  placeholder="Enter node title"
                  :aria-describedby="titleError ? 'node-title-error' : undefined"
                  :aria-invalid="titleError ? 'true' : 'false'"
                  class="w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  :class="titleError ? 'border-red-400 bg-red-50' : 'border-gray-300'"
                  @blur="touchedTitle = true"
                  @input="touchedTitle = true"
                />
                <p
                  v-if="titleError"
                  id="node-title-error"
                  role="alert"
                  class="mt-1 text-xs text-red-600"
                >
                  {{ titleError }}
                </p>
              </div>

              <!-- Description field -->
              <div>
                <label for="node-description" class="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="node-description"
                  v-model="form.description"
                  rows="3"
                  placeholder="Enter an optional description"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <!-- Type field -->
              <div>
                <label for="node-type" class="block text-sm font-medium text-gray-700 mb-1">
                  Type <span class="text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="node-type"
                  v-model="form.type"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option :value="NODE_TYPES.sendMessage">Send Message</option>
                  <option :value="NODE_TYPES.addComment">Add Comment</option>
                  <option value="businessHours">Business Hours</option>
                </select>
              </div>

              <!-- Footer actions -->
              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @click="close"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isSubmitDisabled"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    v-if="isPending"
                    class="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {{ isPending ? 'Creating…' : 'Create Node' }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { createNode } from '../api/nodes.js'
import { useFlowchartStore } from '../stores/flowchartStore.js'
import { NODE_TYPES } from '../utils/nodeTypes.js'
import { validateRequired } from '../utils/validation.js'

// ---------------------------------------------------------------------------
// Props & emits
// ---------------------------------------------------------------------------

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'node-created'])

// ---------------------------------------------------------------------------
// Stores & IDs
// ---------------------------------------------------------------------------

const flowchartStore = useFlowchartStore()
const titleId = 'create-node-modal-title'

// ---------------------------------------------------------------------------
// Template refs
// ---------------------------------------------------------------------------

const titleInputRef = ref(null)

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

const form = ref({
  title: '',
  description: '',
  type: 'sendMessage',
})

const touchedTitle = ref(false)

const titleError = computed(() => {
  if (!touchedTitle.value) return null
  return validateRequired(form.value.title)
})

const isSubmitDisabled = computed(() => {
  return !!validateRequired(form.value.title) || isPending.value
})

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

const { mutate, isPending } = useMutation({
  mutationFn: (data) => createNode(data),
  onSuccess: (newNode) => {
    flowchartStore.addNode(newNode)
    emit('node-created', newNode)
    emit('update:modelValue', false)
    resetForm()
  },
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function handleSubmit() {
  touchedTitle.value = true
  if (validateRequired(form.value.title)) return
  mutate({ ...form.value })
}

function close() {
  emit('update:modelValue', false)
}

function resetForm() {
  form.value = { title: '', description: '', type: 'sendMessage' }
  touchedTitle.value = false
}

// ---------------------------------------------------------------------------
// Focus management — focus the title input whenever the modal opens
// ---------------------------------------------------------------------------

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick()
      titleInputRef.value?.focus()
    } else {
      resetForm()
    }
  },
)
</script>
