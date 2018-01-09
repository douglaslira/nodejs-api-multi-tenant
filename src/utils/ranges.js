'use strict'

export const createRange = (skip, result, count) => {
  return {
    start: result.length ? skip + 1 : 0,
    end: result.length ? skip + result.length : 0,
    total: count
  }
}
