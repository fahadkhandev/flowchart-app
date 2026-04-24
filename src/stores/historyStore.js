import { defineStore } from 'pinia'

const MAX_HISTORY = 50

export const useHistoryStore = defineStore('history', {
  state: () => ({
    /** @type {Array<{ do: Function, undo: Function, description?: string }>} */
    past: [],
    /** @type {Array<{ do: Function, undo: Function, description?: string }>} */
    future: [],
  }),

  getters: {
    canUndo: (state) => state.past.length > 0,
    canRedo: (state) => state.future.length > 0,
  },

  actions: {
    /**
     * Adds a command to past, clears future, enforces max 50-item cap.
     * @param {{ do: Function, undo: Function, description?: string }} command
     */
    push(command) {
      this.past.push(command)
      this.future = []
      if (this.past.length > MAX_HISTORY) {
        this.past.shift()
      }
    },

    /**
     * Pops the last command from past, calls command.undo(), pushes to future.
     */
    undo() {
      if (this.past.length === 0) return
      const command = this.past.pop()
      command.undo()
      this.future.push(command)
    },

    /**
     * Pops the last command from future, calls command.do(), pushes to past.
     */
    redo() {
      if (this.future.length === 0) return
      const command = this.future.pop()
      command.do()
      this.past.push(command)
    },
  },
})
