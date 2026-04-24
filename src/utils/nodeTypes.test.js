import { describe, it, expect } from 'vitest'
import {
  NODE_TYPES,
  DISPLAY_ONLY_TYPES,
  isDisplayOnly,
  getNodeIcon,
  NODE_TYPE_LABELS,
  getNodeTypeColor,
} from './nodeTypes.js'

describe('NODE_TYPES', () => {
  it('maps sendMessage to sendMessage', () => {
    expect(NODE_TYPES.sendMessage).toBe('sendMessage')
  })

  it('maps addComment to addComment', () => {
    expect(NODE_TYPES.addComment).toBe('addComment')
  })

  it('maps businessHours to dateTime', () => {
    expect(NODE_TYPES.businessHours).toBe('dateTime')
  })

  it('maps success to dateTimeConnector', () => {
    expect(NODE_TYPES.success).toBe('dateTimeConnector')
  })

  it('maps failure to dateTimeConnector', () => {
    expect(NODE_TYPES.failure).toBe('dateTimeConnector')
  })

  it('maps trigger to trigger', () => {
    expect(NODE_TYPES.trigger).toBe('trigger')
  })

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(NODE_TYPES)).toBe(true)
  })
})

describe('isDisplayOnly', () => {
  it('returns true for dateTimeConnector', () => {
    expect(isDisplayOnly('dateTimeConnector')).toBe(true)
  })

  it('returns true for trigger', () => {
    expect(isDisplayOnly('trigger')).toBe(true)
  })

  it('returns false for sendMessage', () => {
    expect(isDisplayOnly('sendMessage')).toBe(false)
  })

  it('returns false for addComment', () => {
    expect(isDisplayOnly('addComment')).toBe(false)
  })

  it('returns false for dateTime', () => {
    expect(isDisplayOnly('dateTime')).toBe(false)
  })
})

describe('getNodeIcon', () => {
  it('returns a string for sendMessage', () => {
    expect(typeof getNodeIcon('sendMessage')).toBe('string')
    expect(getNodeIcon('sendMessage').length).toBeGreaterThan(0)
  })

  it('returns a string for addComment', () => {
    expect(typeof getNodeIcon('addComment')).toBe('string')
  })

  it('returns a string for dateTime', () => {
    expect(typeof getNodeIcon('dateTime')).toBe('string')
  })

  it('returns a string for dateTimeConnector', () => {
    expect(typeof getNodeIcon('dateTimeConnector')).toBe('string')
  })

  it('returns a string for trigger', () => {
    expect(typeof getNodeIcon('trigger')).toBe('string')
  })

  it('returns a fallback string for unknown types', () => {
    const fallback = getNodeIcon('unknown-type')
    expect(typeof fallback).toBe('string')
    expect(fallback.length).toBeGreaterThan(0)
  })
})

describe('NODE_TYPE_LABELS', () => {
  it('has a label for sendMessage', () => {
    expect(NODE_TYPE_LABELS.sendMessage).toBe('Send Message')
  })

  it('has a label for addComment', () => {
    expect(NODE_TYPE_LABELS.addComment).toBe('Add Comment')
  })

  it('has a label for dateTime', () => {
    expect(NODE_TYPE_LABELS.dateTime).toBe('Business Hours')
  })

  it('has a label for dateTimeConnector', () => {
    expect(NODE_TYPE_LABELS.dateTimeConnector).toBe('Connector')
  })

  it('has a label for trigger', () => {
    expect(NODE_TYPE_LABELS.trigger).toBe('Trigger')
  })
})

describe('getNodeTypeColor', () => {
  it('returns a non-empty string for sendMessage', () => {
    const color = getNodeTypeColor('sendMessage')
    expect(typeof color).toBe('string')
    expect(color.length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for addComment', () => {
    expect(getNodeTypeColor('addComment').length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for dateTime', () => {
    expect(getNodeTypeColor('dateTime').length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for dateTimeConnector', () => {
    expect(getNodeTypeColor('dateTimeConnector').length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for trigger', () => {
    expect(getNodeTypeColor('trigger').length).toBeGreaterThan(0)
  })

  it('returns a fallback string for unknown types', () => {
    const fallback = getNodeTypeColor('unknown')
    expect(typeof fallback).toBe('string')
    expect(fallback.length).toBeGreaterThan(0)
  })
})
