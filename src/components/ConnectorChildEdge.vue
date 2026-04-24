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

// Draw an orthogonal path from the connector pill's bottom handle to the
// child node's top handle. Uses the same elbow logic as TreeEdge so the
// line always starts exactly at the pill and ends exactly at the child,
// even after either node has been manually dragged.
const edgePath = computed(() => {
  const { sourceX, sourceY, targetX, targetY } = props

  if (Math.abs(sourceX - targetX) < 2) {
    return `M ${sourceX} ${sourceY} L ${sourceX} ${targetY}`
  }

  const midY = sourceY + 30
  return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`
})
</script>

<template>
  <BaseEdge :path="edgePath" :marker-end="markerEnd" :style="style" />
</template>
