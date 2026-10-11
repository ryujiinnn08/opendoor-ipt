import { describe, expect, it } from 'vitest'
import { pageItems } from './pageItems.js'

describe('pageItems', () => {
  it('lists every page when there are seven or fewer', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('shortens long lists to seven entries around the current page', () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10])
    expect(pageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])
    expect(pageItems(10, 10)).toEqual([1, 'gap', 6, 7, 8, 9, 10])
  })
})
