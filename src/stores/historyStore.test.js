import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from './historyStore.js'

function makeCommand(label = 'cmd') {
  return {
    do: vi.fn(),
    undo: vi.fn(),
    description: label,
  }
}

describe('historyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // -------------------------------------------------------------------------
  // push
  // -------------------------------------------------------------------------
  describe('push', () => {
    it('adds a command to past', () => {
      const store = useHistoryStore()
      store.push(makeCommand('a'))
      expect(store.past).toHaveLength(1)
    })

    it('clears future when a new command is pushed', () => {
      const store = useHistoryStore()
      const cmd = makeCommand()
      store.push(cmd)
      store.undo()
      expect(store.future).toHaveLength(1)
      store.push(makeCommand('new'))
      expect(store.future).toHaveLength(0)
    })

    it('enforces a maximum of 50 items by removing the oldest', () => {
      const store = useHistoryStore()
      for (let i = 0; i < 55; i++) {
        store.push(makeCommand(`cmd-${i}`))
      }
      expect(store.past).toHaveLength(50)
      // The oldest (cmd-0 through cmd-4) should have been removed
      expect(store.past[0].description).toBe('cmd-5')
    })
  })

  // -------------------------------------------------------------------------
  // undo
  // -------------------------------------------------------------------------
  describe('undo', () => {
    it('calls command.undo() and moves command to future', () => {
      const store = useHistoryStore()
      const cmd = makeCommand()
      store.push(cmd)
      store.undo()
      expect(cmd.undo).toHaveBeenCalledOnce()
      expect(store.past).toHaveLength(0)
      expect(store.future).toHaveLength(1)
    })

    it('does nothing when past is empty', () => {
      const store = useHistoryStore()
      expect(() => store.undo()).not.toThrow()
      expect(store.future).toHaveLength(0)
    })

    it('undoes in LIFO order', () => {
      const store = useHistoryStore()
      const cmd1 = makeCommand('first')
      const cmd2 = makeCommand('second')
      store.push(cmd1)
      store.push(cmd2)
      store.undo()
      expect(cmd2.undo).toHaveBeenCalledOnce()
      expect(cmd1.undo).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // redo
  // -------------------------------------------------------------------------
  describe('redo', () => {
    it('calls command.do() and moves command back to past', () => {
      const store = useHistoryStore()
      const cmd = makeCommand()
      store.push(cmd)
      store.undo()
      store.redo()
      expect(cmd.do).toHaveBeenCalledOnce()
      expect(store.future).toHaveLength(0)
      expect(store.past).toHaveLength(1)
    })

    it('does nothing when future is empty', () => {
      const store = useHistoryStore()
      expect(() => store.redo()).not.toThrow()
      expect(store.past).toHaveLength(0)
    })

    it('redoes in LIFO order (last undone is first redone)', () => {
      const store = useHistoryStore()
      const cmd1 = makeCommand('first')
      const cmd2 = makeCommand('second')
      store.push(cmd1)
      store.push(cmd2)
      store.undo() // undoes cmd2
      store.undo() // undoes cmd1
      store.redo() // redoes cmd1
      expect(cmd1.do).toHaveBeenCalledOnce()
      expect(cmd2.do).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // canUndo / canRedo getters
  // -------------------------------------------------------------------------
  describe('canUndo', () => {
    it('is false when past is empty', () => {
      const store = useHistoryStore()
      expect(store.canUndo).toBe(false)
    })

    it('is true when past has items', () => {
      const store = useHistoryStore()
      store.push(makeCommand())
      expect(store.canUndo).toBe(true)
    })

    it('becomes false after undoing the only command', () => {
      const store = useHistoryStore()
      store.push(makeCommand())
      store.undo()
      expect(store.canUndo).toBe(false)
    })
  })

  describe('canRedo', () => {
    it('is false when future is empty', () => {
      const store = useHistoryStore()
      expect(store.canRedo).toBe(false)
    })

    it('is true after an undo', () => {
      const store = useHistoryStore()
      store.push(makeCommand())
      store.undo()
      expect(store.canRedo).toBe(true)
    })

    it('becomes false after redoing the only command', () => {
      const store = useHistoryStore()
      store.push(makeCommand())
      store.undo()
      store.redo()
      expect(store.canRedo).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // new action after undo clears future
  // -------------------------------------------------------------------------
  describe('new action after undo clears future', () => {
    it('clears future when push is called after undo', () => {
      const store = useHistoryStore()
      store.push(makeCommand('a'))
      store.push(makeCommand('b'))
      store.undo()
      expect(store.canRedo).toBe(true)
      store.push(makeCommand('c'))
      expect(store.canRedo).toBe(false)
      expect(store.future).toHaveLength(0)
    })
  })
})
