import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowchartStore } from './flowchartStore.js'

function makeNode(id, type = 'sendMessage', extra = {}) {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { title: `Node ${id}`, description: '' },
    ...extra,
  }
}

describe('flowchartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // -------------------------------------------------------------------------
  // setNodes
  // -------------------------------------------------------------------------
  describe('setNodes', () => {
    it('replaces the nodes array', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1'), makeNode('2')])
      expect(store.nodes).toHaveLength(2)
      expect(store.nodes[0].id).toBe('1')
    })

    it('builds edges from parentId relationships', () => {
      const store = useFlowchartStore()
      store.setNodes([
        makeNode('1'),
        makeNode('2', 'sendMessage', { data: { title: 'Node 2', description: '', parentId: '1' } }),
      ])

      expect(store.edges).toEqual([
        {
          id: 'edge-1-2',
          source: '1',
          target: '2',
          type: 'step',
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        },
      ])
    })

    it('keeps trigger nodes draggable by default', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('t1', 'trigger')])
      expect(store.nodes[0].draggable).toBeUndefined()
    })

    it('keeps connector nodes draggable by default', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('c1', 'dateTimeConnector')])
      expect(store.nodes[0].draggable).toBeUndefined()
    })

    it('keeps editable nodes draggable by default', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('s1', 'sendMessage')])
      expect(store.nodes[0].draggable).toBeUndefined()
    })

    it('connector nodes produce edges without sourceHandle (flat edge routing)', () => {
      const store = useFlowchartStore()
      store.setNodes([
        makeNode('parent', 'dateTime'),
        makeNode('success-1', 'dateTimeConnector', {
          data: {
            title: 'Success',
            description: 'success',
            parentId: 'parent',
            connectorType: 'success',
          },
        }),
      ])

      expect(store.edges).toEqual([
        {
          id: 'edge-parent-success-1',
          source: 'parent',
          target: 'success-1',
          type: 'step',
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        },
      ])
    })

    it('nodes do not carry connectorNodes metadata (inline rows removed)', () => {
      const store = useFlowchartStore()
      store.setNodes([
        makeNode('parent', 'dateTime', {
          data: {
            title: 'Business Hours',
            description: 'Timezone: UTC',
            connectors: ['success-1', 'failure-1'],
          },
        }),
        makeNode('success-1', 'dateTimeConnector', {
          data: { title: 'Success', description: 'success', parentId: 'parent', connectorType: 'success' },
        }),
        makeNode('failure-1', 'dateTimeConnector', {
          data: { title: 'Failure', description: 'failure', parentId: 'parent', connectorType: 'failure' },
        }),
      ])

      // connectorNodes decoration was removed — property should not exist
      expect(store.nodes[0].data.connectorNodes).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // addNode
  // -------------------------------------------------------------------------
  describe('addNode', () => {
    it('appends a node to the array', () => {
      const store = useFlowchartStore()
      store.addNode(makeNode('1'))
      store.addNode(makeNode('2'))
      expect(store.nodes).toHaveLength(2)
      expect(store.nodes[1].id).toBe('2')
    })
  })

  // -------------------------------------------------------------------------
  // removeNode
  // -------------------------------------------------------------------------
  describe('removeNode', () => {
    it('removes the node with the given id', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1'), makeNode('2'), makeNode('3')])
      store.removeNode('2')
      expect(store.nodes).toHaveLength(2)
      expect(store.nodes.find((n) => n.id === '2')).toBeUndefined()
    })

    it('does nothing when id is not found', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1')])
      store.removeNode('999')
      expect(store.nodes).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------------------
  // updateNode
  // -------------------------------------------------------------------------
  describe('updateNode', () => {
    it('merges patch into the node data field', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1')])
      store.updateNode('1', { title: 'Updated', extra: 42 })
      expect(store.nodes[0].data.title).toBe('Updated')
      expect(store.nodes[0].data.extra).toBe(42)
    })

    it('preserves existing data fields not in the patch', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1')])
      store.updateNode('1', { title: 'New Title' })
      expect(store.nodes[0].data.description).toBe('')
    })

    it('does nothing when id is not found', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1')])
      store.updateNode('999', { title: 'Ghost' })
      expect(store.nodes[0].data.title).toBe('Node 1')
    })
  })

  // -------------------------------------------------------------------------
  // updateNodePosition
  // -------------------------------------------------------------------------
  describe('updateNodePosition', () => {
    it('updates the position of the node with the given id', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1')])
      store.updateNodePosition('1', { x: 200, y: 300 })
      expect(store.nodes[0].position).toEqual({ x: 200, y: 300 })
    })

    it('does nothing when id is not found', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1')])
      store.updateNodePosition('999', { x: 999, y: 999 })
      expect(store.nodes[0].position).toEqual({ x: 0, y: 0 })
    })
  })

  // -------------------------------------------------------------------------
  // setSelectedNodeId
  // -------------------------------------------------------------------------
  describe('setSelectedNodeId', () => {
    it('sets the selectedNodeId', () => {
      const store = useFlowchartStore()
      store.setSelectedNodeId('abc')
      expect(store.selectedNodeId).toBe('abc')
    })

    it('can be set to null', () => {
      const store = useFlowchartStore()
      store.setSelectedNodeId('abc')
      store.setSelectedNodeId(null)
      expect(store.selectedNodeId).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // getNodeById getter
  // -------------------------------------------------------------------------
  describe('getNodeById', () => {
    it('returns the node with the matching id', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1'), makeNode('2')])
      const node = store.getNodeById('2')
      expect(node).toBeDefined()
      expect(node.id).toBe('2')
    })

    it('returns undefined when id is not found', () => {
      const store = useFlowchartStore()
      store.setNodes([makeNode('1')])
      expect(store.getNodeById('999')).toBeUndefined()
    })
  })
})
