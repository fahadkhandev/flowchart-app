/**
 * Validation utility functions.
 *
 * Each function returns an error string when validation fails, or null when
 * the value is valid. This convention makes it easy to bind error messages
 * directly to template expressions.
 */

/**
 * Validates that a value is present (not null, undefined, or blank).
 *
 * @param {*} value
 * @returns {string|null} Error message or null.
 */
export function validateRequired(value) {
  if (value == null) return 'This field is required'
  if (typeof value === 'string' && value.trim() === '') return 'This field is required'
  return null
}

/**
 * Validates that a business-hours end time is strictly after the start time.
 *
 * Both arguments are coerced to Date objects for comparison, so they may be
 * passed as ISO strings, timestamps, or Date instances.
 *
 * @param {string|number|Date} start - Start date/time.
 * @param {string|number|Date} end   - End date/time.
 * @returns {string|null} Error message or null.
 */
export function validateBusinessHours(start, end) {
  if (start == null || start === '') return 'Start time is required'
  if (end == null || end === '') return 'End time is required'

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (endDate <= startDate) return 'End time must be after start time'
  return null
}

/**
 * Validates that a file's MIME type is in the list of allowed types.
 *
 * @param {{ type: string }} file          - File object (e.g. from an <input type="file">).
 * @param {string[]}         allowedTypes  - Array of allowed MIME type strings.
 * @returns {string|null} Error message or null.
 */
export function validateFileType(file, allowedTypes) {
  if (!allowedTypes.includes(file.type)) {
    return `File type '${file.type}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`
  }
  return null
}

/**
 * Validates that a file's size does not exceed the maximum allowed bytes.
 *
 * @param {{ size: number }} file  - File object (e.g. from an <input type="file">).
 * @param {number}           maxBytes - Maximum allowed file size in bytes.
 * @returns {string|null} Error message or null.
 */
export function validateFileSize(file, maxBytes) {
  if (file.size > maxBytes) {
    return `File size exceeds the maximum allowed size of ${maxBytes} bytes`
  }
  return null
}
