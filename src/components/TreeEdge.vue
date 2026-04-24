<script setup>
import { computed } from 'vue'
import { BaseEdge } from '@vue-flow/core'

const props = defineProps({
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  markerEnd: { type: String, default: '' },
  style: { type: Object, default: () => ({}) },
})

// How far below the source handle the horizontal branch occurs
const BRANCH_OFFSET = 40

const edgePath = computed(() => {
  const { sourceX, sourceY, targetX, targetY } = props

  // Snap to straight vertical if nodes are close to the same column
  if (Math.abs(sourceX - targetX) < 2) {
    return `M ${sourceX} ${sourceY} L ${sourceX} ${targetY}`
  }

  const midY = sourceY + BRANCH_OFFSET
  return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`
})
</script>

<template>
  <BaseEdge :path="edgePath" :marker-end="markerEnd" :style="style" />
</template>
