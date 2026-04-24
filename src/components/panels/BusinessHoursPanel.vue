<script setup>
import { ref, computed, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
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
// Local state — deep clone of businessHours so we don't mutate the store
// ---------------------------------------------------------------------------
function cloneBusinessHours() {
  return (props.node?.data?.businessHours ?? []).map((day) => ({ ...day }))
}

const localHours = ref(cloneBusinessHours())

// Keep local state in sync when the node prop changes
watch(
  () => props.node?.data?.businessHours,
  () => {
    localHours.value = cloneBusinessHours()
  },
  { deep: true }
)

// ---------------------------------------------------------------------------
// Validation — per-day time errors
// ---------------------------------------------------------------------------
const timeErrors = computed(() => {
  return localHours.value.map((day) => {
    if (!day.isOpen) return null
    if (!day.openTime || !day.closeTime) return null
    return day.closeTime <= day.openTime ? 'Close time must be after open time' : null
  })
})

const hasAnyError = computed(() => timeErrors.value.some((e) => e !== null))

// ---------------------------------------------------------------------------
// Dirty check — compare with original node data
// ---------------------------------------------------------------------------
const isUnchanged = computed(() => {
  const original = props.node?.data?.businessHours ?? []
  if (original.length !== localHours.value.length) return false
  return localHours.value.every((day, i) => {
    const orig = original[i]
    if (!orig) return false
    return (
      day.isOpen === orig.isOpen &&
      day.openTime === orig.openTime &&
      day.closeTime === orig.closeTime
    )
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function toPickerValue(value) {
  if (!value) return null

  const [hours = '0', minutes = '0'] = value.split(':')

  return {
    hours: Number(hours),
    minutes: Number(minutes),
  }
}

function toTimeString(value) {
  if (!value || typeof value.hours !== 'number' || typeof value.minutes !== 'number') {
    return ''
  }

  return `${String(value.hours).padStart(2, '0')}:${String(value.minutes).padStart(2, '0')}`
}

function updateDayTime(index, field, value) {
  localHours.value[index] = {
    ...localHours.value[index],
    [field]: toTimeString(value),
  }
}

function cloneHours(hours = []) {
  return hours.map((day) => ({ ...day }))
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function applyBusinessHours(businessHours) {
  const nextHours = cloneHours(businessHours)

  localHours.value = nextHours
  flowchartStore.updateNode(props.node.id, { businessHours: nextHours })
  save({
    id: props.node.id,
    patch: { businessHours: nextHours },
  })
}

function onSave() {
  const previousHours = cloneHours(props.node?.data?.businessHours ?? [])
  const nextHours = cloneHours(localHours.value)

  historyStore.push({
    description: `Update business hours ${props.node.id}`,
    do: () => applyBusinessHours(nextHours),
    undo: () => applyBusinessHours(previousHours),
  })

  applyBusinessHours(nextHours)
}
</script>

<template>
  <div class="space-y-4">
    <section aria-labelledby="business-hours-heading">
      <h3
        id="business-hours-heading"
        class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3"
      >
        Business Hours
      </h3>

      <!-- Timezone (read-only) -->
      <div class="mb-4 flex items-center gap-2">
        <span class="text-xs font-medium text-gray-500">Timezone:</span>
        <span class="text-sm text-gray-700">{{ node.data?.timezone ?? 'UTC' }}</span>
      </div>

      <!-- Day rows -->
      <div class="space-y-3">
        <div
          v-for="(day, index) in localHours"
          :key="day.day"
          class="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2"
        >
          <!-- Day header row: name + toggle -->
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">{{ capitalize(day.day) }}</span>

            <label class="flex items-center gap-2 cursor-pointer select-none">
              <span class="text-xs text-gray-500">{{ day.isOpen ? 'Open' : 'Closed' }}</span>
              <input
                v-model="day.isOpen"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                :aria-label="`Toggle ${capitalize(day.day)}`"
              />
            </label>
          </div>

          <!-- Time inputs (only when open) -->
          <div
            v-if="day.isOpen"
            class="flex items-center gap-3"
          >
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs text-gray-500">Open</label>
              <VueDatePicker
                :model-value="toPickerValue(day.openTime)"
                time-picker
                auto-apply
                :clearable="false"
                :minutes-increment="5"
                input-class-name="business-hours-picker"
                :aria-label="`${capitalize(day.day)} open time`"
                @update:model-value="updateDayTime(index, 'openTime', $event)"
              />
            </div>

            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs text-gray-500">Close</label>
              <VueDatePicker
                :model-value="toPickerValue(day.closeTime)"
                time-picker
                auto-apply
                :clearable="false"
                :minutes-increment="5"
                input-class-name="business-hours-picker"
                :aria-label="`${capitalize(day.day)} close time`"
                @update:model-value="updateDayTime(index, 'closeTime', $event)"
              />
            </div>
          </div>

          <!-- Validation error -->
          <p
            v-if="timeErrors[index]"
            class="text-xs text-red-600"
            role="alert"
          >
            {{ timeErrors[index] }}
          </p>
        </div>
      </div>

      <!-- Save button -->
      <button
        type="button"
        class="mt-4 w-full py-1.5 px-3 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        :disabled="isUnchanged || hasAnyError || isPending"
        :aria-busy="isPending"
        @click="onSave"
      >
        {{ isPending ? 'Saving…' : 'Save' }}
      </button>
    </section>
  </div>
</template>

<style scoped>
:deep(.business-hours-picker) {
  width: 100%;
  border: 1px solid rgb(209 213 219);
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

:deep(.business-hours-picker:focus) {
  outline: none;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 0.4);
  border-color: rgb(59 130 246);
}
</style>
