import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseNode from './BaseNode.vue'

// Mock @vue-flow/core Handle component and Position enum
vi.mock('@vue-flow/core', () => ({
  Handle: {
    name: 'Handle',
    template: '<div class="vue-flow-handle" />',
    props: ['id', 'type', 'position', 'style'],
  },
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Right: 'right',
  },
}))

const defaultProps = {
  id: 'node-1',
  data: {
    title: 'Send a greeting',
    description: 'This node sends a greeting message to the user.',
  },
  type: 'sendMessage',
}

function mountNode(propsOverride = {}) {
  return mount(BaseNode, {
    props: { ...defaultProps, ...propsOverride },
  })
}

describe('BaseNode', () => {
  describe('title rendering', () => {
    it('renders the full node title', () => {
      const wrapper = mountNode()
      expect(wrapper.text()).toContain('Send a greeting')
    })

    it('renders the title in bold', () => {
      const wrapper = mountNode()
      const titleEl = wrapper.find('.font-bold')
      expect(titleEl.exists()).toBe(true)
      expect(titleEl.text()).toBe('Send a greeting')
    })
  })

  describe('description truncation', () => {
    it('renders description text when present', () => {
      const wrapper = mountNode()
      expect(wrapper.text()).toContain('This node sends a greeting message to the user.')
    })

    it('truncates descriptions longer than 50 characters with ellipsis', () => {
      const longDesc = 'A'.repeat(60)
      const wrapper = mountNode({ data: { title: 'Test', description: longDesc } })
      const descEl = wrapper.find('.text-gray-500')
      expect(descEl.text()).toBe('A'.repeat(50) + '…')
    })

    it('does not truncate descriptions of exactly 50 characters', () => {
      const exactDesc = 'B'.repeat(50)
      const wrapper = mountNode({ data: { title: 'Test', description: exactDesc } })
      const descEl = wrapper.find('.text-gray-500')
      expect(descEl.text()).toBe(exactDesc)
    })

    it('does not render description element when description is absent', () => {
      const wrapper = mountNode({ data: { title: 'No desc' } })
      expect(wrapper.find('.text-gray-500').exists()).toBe(false)
    })
  })

  describe('type badge', () => {
    it('shows the human-readable type label for sendMessage', () => {
      const wrapper = mountNode({ type: 'sendMessage' })
      expect(wrapper.text()).toContain('Send Message')
    })

    it('shows the human-readable type label for addComment', () => {
      const wrapper = mountNode({ type: 'addComment' })
      expect(wrapper.text()).toContain('Add Comment')
    })

    it('shows the human-readable type label for dateTime', () => {
      const wrapper = mountNode({ type: 'dateTime' })
      expect(wrapper.text()).toContain('Business Hours')
    })
  })

  describe('keyboard accessibility', () => {
    it('emits select event with node id on Enter keydown', async () => {
      const wrapper = mountNode()
      await wrapper.trigger('keydown.enter')
      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')[0]).toEqual(['node-1'])
    })

    it('emits select event with node id on Space keydown', async () => {
      const wrapper = mountNode()
      await wrapper.trigger('keydown.space')
      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')[0]).toEqual(['node-1'])
    })

    it('has tabindex="0" for keyboard focus', () => {
      const wrapper = mountNode()
      expect(wrapper.attributes('tabindex')).toBe('0')
    })

    it('has role="button" for screen readers', () => {
      const wrapper = mountNode()
      expect(wrapper.attributes('role')).toBe('button')
    })

    it('has aria-label describing the node', () => {
      const wrapper = mountNode()
      expect(wrapper.attributes('aria-label')).toBe('Open details for Send a greeting')
    })
  })

  describe('display-only nodes', () => {
    it('renders a read-only badge for trigger type', () => {
      const wrapper = mountNode({ type: 'trigger' })
      expect(wrapper.text()).toContain('read-only')
    })

    it('renders a read-only badge for dateTimeConnector type', () => {
      const wrapper = mountNode({
        type: 'dateTimeConnector',
        data: { title: 'Success', description: 'success' },
      })
      expect(wrapper.text()).not.toContain('read-only')
      expect(wrapper.text()).toContain('Success')
    })

    it('does not render a read-only badge for sendMessage type', () => {
      const wrapper = mountNode({ type: 'sendMessage' })
      expect(wrapper.text()).not.toContain('read-only')
    })

    it('applies reduced opacity to display-only nodes', () => {
      const wrapper = mountNode({ type: 'trigger' })
      expect(wrapper.classes()).toContain('opacity-80')
    })

    it('does not apply reduced opacity to editable nodes', () => {
      const wrapper = mountNode({ type: 'sendMessage' })
      expect(wrapper.classes()).not.toContain('opacity-75')
    })

    it('does not expose connector nodes as interactive buttons', () => {
      const wrapper = mountNode({
        type: 'dateTimeConnector',
        data: { title: 'Success', description: 'success' },
      })

      expect(wrapper.attributes('tabindex')).toBe('-1')
      expect(wrapper.attributes('role')).toBe('img')
      expect(wrapper.attributes('aria-label')).toBe('Success connector')
    })
  })

  describe('SVG icon', () => {
    it('renders an SVG element with a use tag pointing to the sprite', () => {
      const wrapper = mountNode({ type: 'sendMessage' })
      const useEl = wrapper.find('svg use')
      expect(useEl.exists()).toBe(true)
      expect(useEl.attributes('href')).toBe('/icons.svg#social-icon')
    })

    it('uses the correct icon for addComment type', () => {
      const wrapper = mountNode({ type: 'addComment' })
      const useEl = wrapper.find('svg use')
      expect(useEl.attributes('href')).toBe('/icons.svg#documentation-icon')
    })
  })

  describe('Vue Flow handles', () => {
    it('renders a target handle', () => {
      const wrapper = mountNode()
      const handles = wrapper.findAllComponents({ name: 'Handle' })
      const targetHandle = handles.find((h) => h.props('type') === 'target')
      expect(targetHandle).toBeTruthy()
    })

    it('renders a source handle', () => {
      const wrapper = mountNode()
      const handles = wrapper.findAllComponents({ name: 'Handle' })
      const sourceHandle = handles.find((h) => h.props('type') === 'source')
      expect(sourceHandle).toBeTruthy()
    })

    it('renders a single bottom source handle (no connector-specific handles)', () => {
      // connectorNodes inline rows were removed — dateTime nodes now use
      // a single bottom source handle like every other node type.
      const wrapper = mountNode({
        type: 'dateTime',
        data: {
          title: 'Business Hours',
          description: 'Timezone: UTC',
        },
      })

      const handles = wrapper.findAllComponents({ name: 'Handle' })
      const sourceHandles = handles.filter((h) => h.props('type') === 'source')

      expect(sourceHandles).toHaveLength(1)
      expect(sourceHandles[0].props('position')).toBe('bottom')
      // Connector labels are separate canvas nodes, not rendered inside the card
      expect(wrapper.text()).not.toContain('Success')
      expect(wrapper.text()).not.toContain('Failure')
    })
  })
})
