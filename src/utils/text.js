/**
 * Text utility functions.
 */

/**
 * Truncates a string to a maximum length, appending an ellipsis character
 * when the string exceeds the limit.
 *
 * @param {string|null|undefined} str - The string to truncate.
 * @param {number} [maxLength=50] - Maximum number of characters before truncation.
 * @returns {string} The original string if within limit, or the first maxLength
 *   characters followed by '…'. Returns '' for null/undefined input.
 */
export function truncateText(str, maxLength = 50) {
  if (str == null) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}
