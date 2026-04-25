import { reactive, ref, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DetailsDrawer from './DetailsDrawer.vue'
import { useFlowchartStore } from '../stores/flowchartStore.js'

const route = reactive({ params: {} })
const pushMock = vi.fn()
const replaceMock = vi.fn()
const updateNodeMock = vi.fn(async (id, patch) => ({ id, data: patch }))
const deleteNodeMock = vi.fn(async (id) => id)

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))

vi.mock('@tanstack/vue-query', () => ({
  useMutation: ({ mutationFn, onSuccess }) => {
    const isPending = ref(false)

    return {
      isPending,
      mutate: async (variables) => {
        isPending.value = true
        const result = await mutationFn(variables)
        onSuccess?.(result)
        isPending.value = false
      },
    }
  },
}))

vi.mock('../api/nodes.js', () => ({
  updateNode: (...args) => updateNodeMock(...args),
  deleteNode: (...args) => deleteNodeMock(...args),
}))

function mountDrawer() {
  return mount(DetailsDrawer, {
    global: {
      stubs: {
        Transition: false,
        Suspense: false,
      },
    },
  })
}

describe('DetailsDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.params.id = undefined
    pushMock.mockReset()
    replaceMock.mockReset()
    updateNodeMock.mockClear()
    deleteNodeMock.mockClear()
  })

  it('allows editing and deleting trigger nodes from the drawer', async () => {
    const store = useFlowchartStore()
    store.setNodes([
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          title: 'Trigger',
          description: 'conversationOpened',
          type: 'conversationOpened',
        },
      },
    ])

    route.params.id = 'trigger-1'

    const wrapper = mountDrawer()
    await nextTick()

    expect(wrapper.find('#drawer-title').exists()).toBe(true)
    expect(wrapper.find('#drawer-description').exists()).toBe(true)
    expect(wrapper.text()).toContain('Save')
  })

  it('shows attachments in the drawer when the node payload contains them', async () => {
    const store = useFlowchartStore()
    store.setNodes([
      {
        id: 'msg-1',
        type: 'sendMessage',
        position: { x: 0, y: 0 },
        data: {
          title: 'Welcome',
          description: 'Sends a welcome message',
          payload: [
            { type: 'text', text: 'Hello' },
            { type: 'attachment', attachment: 'https://example.com/file.pdf' },
          ],
        },
      },
    ])

    route.params.id = 'msg-1'

    const wrapper = mountDrawer()
    await flushPromises()

    expect(wrapper.text()).toContain('Attachments')
    expect(wrapper.text()).toContain('https://example.com/file.pdf')
  })

  it('opens when the URL already has a node id before nodes are loaded', async () => {
    route.params.id = 'late-node'

    const wrapper = mountDrawer()
    await nextTick()

    expect(wrapper.find('#drawer-title').exists()).toBe(false)

    const store = useFlowchartStore()
    store.setNodes([
      {
        id: 'late-node',
        type: 'sendMessage',
        position: { x: 0, y: 0 },
        data: {
          title: 'Late Node',
          description: 'Loaded after routing',
        },
      },
    ])

    await flushPromises()

    expect(wrapper.find('#drawer-title').exists()).toBe(true)
    expect(wrapper.text()).toContain('Late Node')
  })

  it('redirects away when a connector node is accessed by URL', async () => {
    const store = useFlowchartStore()
    store.setNodes([
      {
        id: 'connector-1',
        type: 'dateTimeConnector',
        position: { x: 0, y: 0 },
        data: {
          title: 'Success',
          description: 'success',
          connectorType: 'success',
        },
      },
    ])

    route.params.id = 'connector-1'

    const wrapper = mountDrawer()
    await flushPromises()

    expect(wrapper.find('#drawer-title').exists()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/')
  })

  it('does not show a delete button in the drawer', async () => {
    const store = useFlowchartStore()
    store.setNodes([
      {
        id: 'comment-1',
        type: 'addComment',
        position: { x: 0, y: 0 },
        data: {
          title: 'Comment',
          description: 'Stores a comment',
          comment: 'Hello',
        },
      },
    ])

    route.params.id = 'comment-1'

    const wrapper = mountDrawer()
    await nextTick()

    expect(wrapper.text()).not.toContain('Delete node')
  })
})
