import { defineStore } from 'pinia'

function cloneNode(node) {
  return {
    ...node,
    position: node.position ? { ...node.position } : node.position,
    data: node.data ? { ...node.data } : node.data,
  }
}

function getNodeParentId(node) {
  return node?.data?.parentId ?? null
}

function buildEdges(nodes) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  return nodes
    .filter((node) => {
      const parentId = getNodeParentId(node)
      return parentId !== null && parentId !== '-1' && nodesById.has(String(parentId))
    })
    .map((node) => {
      const parentId = String(getNodeParentId(node))
      const parentNode = nodesById.get(parentId)
      const isConnectorChild = node.type === 'dateTimeConnector'
      return {
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: isConnectorChild ? 'connectorChild' : 'tree',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      }
    })
}

function rebuildGraph(store, nodes) {
  const clonedNodes = nodes.map(cloneNode)
  store.nodes = clonedNodes
  store.edges = buildEdges(clonedNodes)
}

export const useFlowchartStore = defineStore('flowchart', {
  state: () => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
  }),

  getters: {
    getNodeById: (state) => (id) => state.nodes.find((n) => n.id === id),
  },

  actions: {
    setNodes(nodes) {
      rebuildGraph(this, nodes)
    },

    addNode(node) {
      rebuildGraph(this, [...this.nodes, node])
    },

    updateNode(id, patch) {
      rebuildGraph(this, this.nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...patch } }
          : node
      ))
    },

    removeNode(id) {
      const toRemove = new Set()
      const queue = [String(id)]

      while (queue.length > 0) {
        const current = queue.shift()
        toRemove.add(current)
        for (const node of this.nodes) {
          const parentId = node.data?.parentId
          if (parentId && String(parentId) === current && !toRemove.has(node.id)) {
            queue.push(node.id)
          }
        }
      }

      rebuildGraph(this, this.nodes.filter((n) => !toRemove.has(n.id)))
    },

    setSelectedNodeId(id) {
      this.selectedNodeId = id
    },

    updateNodePosition(id, position) {
      const node = this.nodes.find((n) => n.id === id)
      if (node) {
        node.position = { ...position }
        this.edges = buildEdges(this.nodes)
      }
    },
  },
})
