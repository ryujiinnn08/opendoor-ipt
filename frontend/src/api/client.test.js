import { describe, expect, it } from 'vitest'
import { generalErrorFrom } from './client.js'

describe('generalErrorFrom', () => {
  it.each([{}, { message: 'Too Many Attempts.' }, { errors: { email: ['Too Many Attempts.'] } }])('explains rate limits regardless of the server payload', (data) => {
    expect(generalErrorFrom({ response: { status: 429, data } })).toBe('Too many tries. Please wait a minute and try again.')
  })
})
