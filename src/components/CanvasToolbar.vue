<template>
	<div class="absolute top-4 left-4 flex flex-col items-start gap-2 z-10">
		<div class="flex items-center gap-3">
			<!-- Undo / Redo group -->
			<div
				class="flex items-center rounded-md shadow border border-gray-300 overflow-hidden"
			>
				<button
					class="px-3 py-2 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-r border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
					:disabled="!historyStore.canUndo"
					:aria-disabled="!historyStore.canUndo"
					aria-label="Undo (Ctrl+Z)"
					title="Undo (Ctrl+Z)"
					@click="historyStore.undo()"
				>
					↩ Undo
				</button>
				<button
					class="px-3 py-2 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					:disabled="!historyStore.canRedo"
					:aria-disabled="!historyStore.canRedo"
					aria-label="Redo (Ctrl+Y)"
					title="Redo (Ctrl+Y)"
					@click="historyStore.redo()"
				>
					↪ Redo
				</button>
			</div>
		</div>

		<!-- Zoom controls: vertical -->
		<div
			class="flex flex-col rounded-md shadow border border-gray-300 overflow-hidden"
		>
			<button
				class="px-3 py-2 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-b border-gray-300 leading-none"
				title="Zoom in"
				aria-label="Zoom in"
				@click="zoomIn()"
			>
				+
			</button>
			<button
				class="px-3 py-2 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-b border-gray-300 leading-none"
				title="Zoom out"
				aria-label="Zoom out"
				@click="zoomOut()"
			>
				−
			</button>
			<button
				class="px-3 py-2 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 leading-none"
				title="Fit view"
				aria-label="Fit view"
				@click="fitView()"
			>
				⊡
			</button>
		</div>

		<!-- Lock / Unlock -->
		<button
			class="flex items-center justify-center w-9 h-9 rounded-md shadow border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
			:class="locked ? 'border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100' : ''"
			:title="locked ? 'Unlock canvas' : 'Lock canvas'"
			:aria-label="locked ? 'Unlock canvas' : 'Lock canvas'"
			@click="toggleLock()"
		>
			<!-- Locked icon -->
			<svg v-if="locked" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<rect x="5" y="11" width="14" height="10" rx="2" stroke-width="2" stroke-linejoin="round" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 0 1 8 0v4" />
			</svg>
			<!-- Unlocked icon -->
			<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<rect x="5" y="11" width="14" height="10" rx="2" stroke-width="2" stroke-linejoin="round" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 0 1 8 0" />
			</svg>
		</button>
	</div>
</template>

<script setup>
import { inject, onMounted, onUnmounted } from "vue";
import { useHistoryStore } from "../stores/historyStore.js";

defineEmits(["open-create-modal"]);

const historyStore = useHistoryStore();
const zoomIn = inject("zoomIn");
const zoomOut = inject("zoomOut");
const fitView = inject("fitView");
const locked = inject("locked");
const toggleLock = inject("toggleLock");

function handleKeydown(event) {
	const isMac = /Mac/i.test(navigator.userAgent);
	const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

	if (!ctrlOrCmd) return;

	if (event.key === "z" && !event.shiftKey) {
		event.preventDefault();
		if (historyStore.canUndo) historyStore.undo();
		return;
	}

	if (event.key === "y" || (isMac && event.key === "z" && event.shiftKey)) {
		event.preventDefault();
		if (historyStore.canRedo) historyStore.redo();
	}
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>
