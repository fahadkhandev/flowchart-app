import { describe, it, expect } from 'vitest'
import { truncateText } from './text.js'

describe('truncateText', () => {
  it('returns the string unchanged when length equals maxLength (boundary)', () => {
    const str = 'a'.repeat(50)
    expect(truncateText(str)).toBe(str)
  })

  it('returns the string unchanged when length is below maxLength', () => {
    expect(truncateText('hello')).toBe('hello')
  })

  it('truncates and appends ellipsis when length exceeds maxLength', () => {
    const str = 'a'.repeat(51)
    expect(truncateText(str)).toBe('a'.repeat(50) + '…')
  })

  it('uses a custom maxLength', () => {
    expect(truncateText('hello world', 5)).toBe('hello…')
  })

  it('returns empty string for empty input', () => {
    expect(truncateText('')).toBe('')
  })

  it('returns empty string for null', () => {
    expect(truncateText(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(truncateText(undefined)).toBe('')
  })

  it('uses the ellipsis character (…), not three dots (...)', () => {
    const result = truncateText('a'.repeat(51))
    expect(result.endsWith('…')).toBe(true)
    expect(result.endsWith('...')).toBe(false)
  })
})
