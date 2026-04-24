import { describe, it, expect } from 'vitest'
import {
  validateRequired,
  validateBusinessHours,
  validateFileType,
  validateFileSize,
} from './validation.js'

describe('validateRequired', () => {
  it('returns null for a valid non-empty string', () => {
    expect(validateRequired('hello')).toBeNull()
  })

  it('returns an error for an empty string', () => {
    expect(validateRequired('')).toBe('This field is required')
  })

  it('returns an error for a whitespace-only string', () => {
    expect(validateRequired('   ')).toBe('This field is required')
  })

  it('returns an error for null', () => {
    expect(validateRequired(null)).toBe('This field is required')
  })

  it('returns an error for undefined', () => {
    expect(validateRequired(undefined)).toBe('This field is required')
  })

  it('returns null for a string with leading/trailing spaces but non-empty content', () => {
    expect(validateRequired('  hello  ')).toBeNull()
  })
})

describe('validateBusinessHours', () => {
  it('returns null for a valid range where end is after start', () => {
    expect(validateBusinessHours('2024-01-01T09:00', '2024-01-01T17:00')).toBeNull()
  })

  it('returns an error when end time equals start time', () => {
    const result = validateBusinessHours('2024-01-01T09:00', '2024-01-01T09:00')
    expect(result).toBe('End time must be after start time')
  })

  it('returns an error when end time is before start time', () => {
    const result = validateBusinessHours('2024-01-01T17:00', '2024-01-01T09:00')
    expect(result).toBe('End time must be after start time')
  })

  it('returns an error when start is missing', () => {
    const result = validateBusinessHours(null, '2024-01-01T17:00')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns an error when end is missing', () => {
    const result = validateBusinessHours('2024-01-01T09:00', null)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('accepts Date objects as arguments', () => {
    const start = new Date('2024-01-01T09:00:00')
    const end = new Date('2024-01-01T17:00:00')
    expect(validateBusinessHours(start, end)).toBeNull()
  })
})

describe('validateFileType', () => {
  it('returns null when file type is in the allowed list', () => {
    const file = { type: 'image/png', size: 1000 }
    expect(validateFileType(file, ['image/png', 'image/jpeg'])).toBeNull()
  })

  it('returns an error when file type is not in the allowed list', () => {
    const file = { type: 'application/pdf', size: 1000 }
    const result = validateFileType(file, ['image/png', 'image/jpeg'])
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns an error for an empty allowed list', () => {
    const file = { type: 'image/png', size: 1000 }
    const result = validateFileType(file, [])
    expect(typeof result).toBe('string')
  })
})

describe('validateFileSize', () => {
  it('returns null when file size is within the limit', () => {
    const file = { type: 'image/png', size: 500 }
    expect(validateFileSize(file, 1000)).toBeNull()
  })

  it('returns null when file size equals the limit exactly', () => {
    const file = { type: 'image/png', size: 1000 }
    expect(validateFileSize(file, 1000)).toBeNull()
  })

  it('returns an error when file size exceeds the limit', () => {
    const file = { type: 'image/png', size: 1001 }
    const result = validateFileSize(file, 1000)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
