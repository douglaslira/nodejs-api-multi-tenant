'use strict'

import {
  computeAverageReadTime,
  countWords,
  readTimeRounding
} from './readTime'

describe('test for multiple content blocks', () => {
  const draftsWithBlocks = {
    content: {
      blocks: [
        {
          entityRanges: [],
          inlineStyleRanges: [],
          depth: 0,
          type: 'unstyled',
          text: 'lorel ipsum dolot et amet',
          key: '7jsp9'
        },
        {
          entityRanges: [],
          inlineStyleRanges: [],
          depth: 0,
          type: 'unstyled',
          text: 'doloe et amet',
          key: 'b2saq'
        },
        {
          entityRanges: [],
          inlineStyleRanges: [],
          depth: 0,
          type: 'unstyled',
          text: 'lorel ipsum',
          key: '80b0r'
        }
      ]
    }
  }

  it('should return correct values from computeAverageReadTime function', () => {
    expect(computeAverageReadTime(draftsWithBlocks.content.blocks)).toBe(1)
  })
  it('should return correct word count from countWords function', () => {
    expect(countWords(draftsWithBlocks.content.blocks)).toBe(10)
  })
  it('should return correct rounding from countWords to readTimeRounding function', () => {
    const numberOfWords = countWords(draftsWithBlocks.content.blocks)
    expect(numberOfWords).toBe(10)
    expect(readTimeRounding(numberOfWords / 200)).toBe(1)
  })
  it('should return correct rounding from countWords with provided numbers', () => {
    expect(readTimeRounding(0.5)).toBe(1)
    expect(readTimeRounding(2.1)).toBe(2)
    expect(readTimeRounding(2.6)).toBe(3)
    expect(readTimeRounding(2.5)).toBe(3)
  })
})

describe('will have test for one content block', () => {
  const draftsWithOneBlock = {
    content: {
      blocks: [
        {
          entityRanges: [],
          inlineStyleRanges: [],
          depth: 0,
          type: 'unstyled',
          text: 'lorel ipsum dolot et amet',
          key: '7jsp9'
        }
      ]
    }
  }

  it('should return correct values from computeAverageReadTime function', () => {
    expect(computeAverageReadTime(draftsWithOneBlock.content.blocks)).toBe(1)
  })
  it('should return correct word count from countWords function', () => {
    expect(countWords(draftsWithOneBlock.content.blocks)).toBe(5)
  })
  it('should return correct rounding from countWords to readTimeRounding function', () => {
    const numberOfWords = countWords(draftsWithOneBlock.content.blocks)
    expect(numberOfWords).toBe(5)
    expect(readTimeRounding(numberOfWords / 200)).toBe(1)
  })
})

describe('will have test for no content block', () => {
  const draftsWithNoBlocks = {
    content: {
      blocks: []
    }
  }

  it('should return correct values from computeAverageReadTime function', () => {
    expect(computeAverageReadTime(draftsWithNoBlocks.content.blocks)).toBe(0)
  })
  it('should return correct word count from countWords function', () => {
    expect(countWords(draftsWithNoBlocks.content.blocks)).toBe(0)
  })
  it('should return correct rounding from countWords to readTimeRounding function', () => {
    const numberOfWords = countWords(draftsWithNoBlocks.content.blocks)
    expect(numberOfWords).toBe(0)
    expect(readTimeRounding(numberOfWords / 200)).toBe(0)
  })
})
