'use strict'

export const computeAverageReadTime = blocks =>
  readTimeRounding(countWords(blocks) / 200)

export const countWords = blocks =>
  blocks.reduce((r, b) => r + b.text.split(/\s/g).length, 0)

export const readTimeRounding = averageReadTime =>
  averageReadTime < 1 ? Math.ceil(averageReadTime) : Math.round(averageReadTime)
