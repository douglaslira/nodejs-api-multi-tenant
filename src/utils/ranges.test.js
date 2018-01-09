import { createRange } from './ranges'

describe('ranges', () => {
  it('creates valid start range', () => {
    expect(createRange(0, new Array(10), 105)).toEqual({
      start: 1,
      end: 10,
      total: 105
    })
  })

  it('creates valid offset range', () => {
    expect(createRange(10, new Array(10), 105)).toEqual({
      start: 11,
      end: 20,
      total: 105
    })
  })

  it('creates valid end range', () => {
    expect(createRange(100, new Array(5), 105)).toEqual({
      start: 101,
      end: 105,
      total: 105
    })
  })

  it('creates valid empty range', () => {
    expect(createRange(1, new Array(), 0)).toEqual({
      start: 0,
      end: 0,
      total: 0
    })
  })
})
