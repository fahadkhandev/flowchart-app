/**
 * Node type constants and helpers.
 *
 * The remote payload uses the following type strings:
 *   'sendMessage', 'addComment', 'dateTime', 'dateTimeConnector', 'trigger'
 *
 * NODE_TYPES maps the semantic names used in the UI to those payload strings.
 */

import {
  PaperAirplaneIcon,
  ChatBubbleLeftIcon,
  CalendarDaysIcon,
  BoltIcon,
} from '@heroicons/vue/24/outline'

/**
 * Maps semantic node names to the type strings used in the remote payload.
 * @type {Readonly<{sendMessage: string, addComment: string, businessHours: string, success: string, failure: string, trigger: string}>}
 */
export const NODE_TYPES = Object.freeze({
  sendMessage: 'sendMessage',
  addComment: 'addComment',
  businessHours: 'dateTime',
  success: 'dateTimeConnector',
  failure: 'dateTimeConnector',
  trigger: 'trigger',
})

/**
 * Node type strings that are read-only (display-only) — users cannot edit
 * or drag these nodes.
 * @type {string[]}
 */
export const DISPLAY_ONLY_TYPES = ['dateTimeConnector', 'trigger']

/**
 * Returns true when the given type string is display-only.
 * @param {string} type
 * @returns {boolean}
 */
export function isDisplayOnly(type) {
  return DISPLAY_ONLY_TYPES.includes(type)
}

/**
 * Returns a Heroicon Vue component for the given node type.
 * Returns null for connector nodes (no icon shown).
 *
 * @param {string} type
 * @returns {object|null} Vue component or null
 */
export function getNodeIconComponent(type) {
  const iconMap = {
    sendMessage: PaperAirplaneIcon,
    addComment: ChatBubbleLeftIcon,
    dateTime: CalendarDaysIcon,
    trigger: BoltIcon,
  }
  return iconMap[type] ?? null
}

/**
 * Returns the SVG symbol id for the given node type (legacy, kept for tests).
 * @param {string} type
 * @returns {string}
 */
export function getNodeIcon(type) {
  const iconMap = {
    sendMessage: 'social-icon',
    addComment: 'documentation-icon',
    dateTime: 'documentation-icon',
    dateTimeConnector: 'documentation-icon',
    trigger: 'github-icon',
  }
  return iconMap[type] ?? 'documentation-icon'
}

/**
 * Human-readable display labels for each payload type string.
 * @type {Record<string, string>}
 */
export const NODE_TYPE_LABELS = {
  sendMessage: 'Send Message',
  addComment: 'Add Comment',
  dateTime: 'Business Hours',
  dateTimeConnector: 'Connector',
  trigger: 'Trigger',
}

/**
 * Returns a Tailwind CSS class string for the node's border and background
 * colour, keyed by payload type string.
 * For dateTimeConnector nodes, pass connectorType to differentiate success/failure.
 *
 * @param {string} type - The node type string from the payload.
 * @param {string} [connectorType] - 'success' | 'failure' for dateTimeConnector nodes.
 * @returns {string} Tailwind CSS classes for border and background.
 */
export function getNodeTypeColor(type, connectorType) {
  if (type === 'dateTimeConnector') {
    return connectorType === 'success'
      ? 'border-green-400 bg-green-50'
      : 'border-red-400 bg-red-50'
  }

  const colorMap = {
    sendMessage: 'border-blue-400 bg-blue-50',
    addComment: 'border-yellow-400 bg-yellow-50',
    dateTime: 'border-purple-400 bg-purple-50',
    trigger: 'border-green-400 bg-green-50',
  }
  return colorMap[type] ?? 'border-gray-300 bg-white'
}
