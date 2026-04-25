<template>
	<div class="absolute top-4 left-4 flex flex-col items-start gap-2 z-10">

		<!-- Add Node button -->
		<div class="rounded-md shadow border overflow-hidden"
			:class="selectedNodeId ? 'border-blue-600' : 'border-blue-200'"
		>
			<button
				class="flex items-center justify-center w-9 h-9 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
				:class="selectedNodeId
					? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
					: 'bg-blue-100 text-blue-400 cursor-not-allowed'"
				:disabled="!selectedNodeId"
				:title="selectedNodeId ? 'Add child node' : 'Select a node first to add a child'"
				:aria-label="selectedNodeId ? 'Add child node' : 'Select a node first to add a child'"
				@click="selectedNodeId && $emit('open-create-modal')"
			>
				<PlusIcon class="w-4 h-4" />
			</button>
		</div>

		<!-- Undo / Redo group -->
		<div class="flex flex-col rounded-md shadow border border-gray-300 overflow-hidden">
			<button
				class="flex items-center justify-center w-9 h-9 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-b border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
				:disabled="!historyStore.canUndo"
				:aria-disabled="!historyStore.canUndo"
				aria-label="Undo (Ctrl+Z)"
				title="Undo (Ctrl+Z)"
				@click="historyStore.undo()"
			>
				<ArrowUturnLeftIcon class="w-4 h-4" />
			</button>
			<button
				class="flex items-center justify-center w-9 h-9 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
				:disabled="!historyStore.canRedo"
				:aria-disabled="!historyStore.canRedo"
				aria-label="Redo (Ctrl+Y)"
				title="Redo (Ctrl+Y)"
				@click="historyStore.redo()"
			>
				<ArrowUturnRightIcon class="w-4 h-4" />
			</button>
		</div>

		<!-- Zoom controls -->
		<div class="flex flex-col rounded-md shadow border border-gray-300 overflow-hidden">
			<button
				class="flex items-center justify-center w-9 h-9 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-b border-gray-300"
				title="Zoom in"
				aria-label="Zoom in"
				@click="zoomIn()"
			>
				<MagnifyingGlassPlusIcon class="w-4 h-4" />
			</button>
			<button
				class="flex items-center justify-center w-9 h-9 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-b border-gray-300"
				title="Zoom out"
				aria-label="Zoom out"
				@click="zoomOut()"
			>
				<MagnifyingGlassMinusIcon class="w-4 h-4" />
			</button>
			<button
				class="flex items-center justify-center w-9 h-9 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
				title="Fit view"
				aria-label="Fit view"
				@click="fitView()"
			>
				<ArrowsPointingOutIcon class="w-4 h-4" />
			</button>
		</div>

		<!-- Lock / Unlock -->
		<div class="rounded-md shadow border overflow-hidden transition-colors"
			:class="locked ? 'border-amber-400' : 'border-gray-300'"
		>
			<button
				class="flex items-center justify-center w-9 h-9 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
				:class="locked ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-white text-gray-700 hover:bg-gray-50'"
				:title="locked ? 'Unlock canvas' : 'Lock canvas'"
				:aria-label="locked ? 'Unlock canvas' : 'Lock canvas'"
				@click="toggleLock()"
			>
				<LockClosedIcon v-if="locked" class="w-4 h-4" />
				<LockOpenIcon v-else class="w-4 h-4" />
			</button>
		</div>

	</div>
</template>

<script setup>
import { inject, onMounted, onUnmounted } from "vue";
import { useFlowchartStore } from "../stores/flowchartStore.js";
import { storeToRefs } from "pinia";
import {
	ArrowUturnLeftIcon,
	ArrowUturnRightIcon,
	MagnifyingGlassPlusIcon,
	MagnifyingGlassMinusIcon,
	ArrowsPointingOutIcon,
	LockClosedIcon,
	LockOpenIcon,
	PlusIcon,
} from "@heroicons/vue/24/outline";
import { useHistoryStore } from "../stores/historyStore.js";

defineEmits(["open-create-modal"]);

const historyStore = useHistoryStore();
const flowchartStore = useFlowchartStore();
const { selectedNodeId } = storeToRefs(flowchartStore);
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
