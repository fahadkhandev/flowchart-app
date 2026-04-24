import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetCache, createNode, fetchNodes, updateNode } from './nodes.js'

describe('nodes API business hours normalisation', () => {
  beforeEach(() => {
    _resetCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalises dateTime times into businessHours for the panel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: 'node-1',
          type: 'dateTime',
          parentId: -1,
          data: {
            timezone: 'UTC',
            times: [
              { day: 'mon', startTime: '09:00', endTime: '17:00' },
              { day: 'wed', startTime: '10:00', endTime: '15:00' },
            ],
          },
        },
      ]),
    }))

    const [node] = await fetchNodes()

    expect(node.data.businessHours).toEqual([
      { day: 'mon', isOpen: true, openTime: '09:00', closeTime: '17:00' },
      { day: 'tue', isOpen: false, openTime: '', closeTime: '' },
      { day: 'wed', isOpen: true, openTime: '10:00', closeTime: '15:00' },
      { day: 'thu', isOpen: false, openTime: '', closeTime: '' },
      { day: 'fri', isOpen: false, openTime: '', closeTime: '' },
      { day: 'sat', isOpen: false, openTime: '', closeTime: '' },
      { day: 'sun', isOpen: false, openTime: '', closeTime: '' },
    ])
  })

  it('keeps times in sync when businessHours are updated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: 'node-1',
          type: 'dateTime',
          parentId: -1,
          data: {
            timezone: 'UTC',
            times: [
              { day: 'mon', startTime: '09:00', endTime: '17:00' },
            ],
          },
        },
      ]),
    }))

    await fetchNodes()

    const updatedNode = await updateNode('node-1', {
      businessHours: [
        { day: 'mon', isOpen: true, openTime: '08:00', closeTime: '16:00' },
        { day: 'tue', isOpen: false, openTime: '', closeTime: '' },
        { day: 'wed', isOpen: true, openTime: '11:00', closeTime: '14:00' },
        { day: 'thu', isOpen: false, openTime: '', closeTime: '' },
        { day: 'fri', isOpen: false, openTime: '', closeTime: '' },
        { day: 'sat', isOpen: false, openTime: '', closeTime: '' },
        { day: 'sun', isOpen: false, openTime: '', closeTime: '' },
      ],
    })

    expect(updatedNode.data.times).toEqual([
      { day: 'mon', startTime: '08:00', endTime: '16:00' },
      { day: 'wed', startTime: '11:00', endTime: '14:00' },
    ])
    expect(updatedNode.data.businessHours[2]).toEqual({
      day: 'wed',
      isOpen: true,
      openTime: '11:00',
      closeTime: '14:00',
    })
  })

  it('maps businessHours create requests to dateTime nodes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([]),
    }))

    const newNode = await createNode({
      title: 'Business Hours',
      description: 'Check office hours',
      type: 'businessHours',
    })

    expect(newNode.type).toBe('dateTime')
    expect(newNode.data.type).toBe('dateTime')
    expect(newNode.data.businessHours).toHaveLength(7)
    expect(newNode.data.times).toEqual([])
  })

  it('lays out parent-child branches like a tree instead of a vertical list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: 1,
          parentId: -1,
          type: 'trigger',
          data: { type: 'conversationOpened' },
        },
        {
          id: 'business-hours',
          parentId: 1,
          type: 'dateTime',
          data: {
            timezone: 'UTC',
            connectors: ['success-connector', 'failure-connector'],
            times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }],
          },
        },
        {
          id: 'success-connector',
          parentId: 'business-hours',
          type: 'dateTimeConnector',
          data: { connectorType: 'success' },
        },
        {
          id: 'failure-connector',
          parentId: 'business-hours',
          type: 'dateTimeConnector',
          data: { connectorType: 'failure' },
        },
        {
          id: 'welcome-message',
          parentId: 'success-connector',
          type: 'sendMessage',
          data: { payload: [{ type: 'text', text: 'Hello' }] },
        },
        {
          id: 'away-message',
          parentId: 'failure-connector',
          type: 'sendMessage',
          data: { payload: [{ type: 'text', text: 'Away' }] },
        },
      ]),
    }))

    const nodes = await fetchNodes()
    const byId = new Map(nodes.map((node) => [node.id, node]))

    expect(byId.get('business-hours').position.y).toBeGreaterThan(byId.get('1').position.y)
    expect(byId.get('success-connector').position.y).toBeGreaterThan(byId.get('business-hours').position.y)
    expect(byId.get('failure-connector').position.x).toBeGreaterThan(byId.get('success-connector').position.x)
    expect(byId.get('welcome-message').position.y).toBeGreaterThan(byId.get('success-connector').position.y)
    expect(byId.get('away-message').position.y).toBeGreaterThan(byId.get('failure-connector').position.y)
  })
})
