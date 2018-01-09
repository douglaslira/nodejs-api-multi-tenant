'use strict'

import { decoder } from './jwt'
import { getCredentials, decodeMiddleware } from './middleware'

test('getCredentials reads bearer auth header and returns token if present', () => {
  expect(
    getCredentials({
      header: {
        authorization: 'Bearer the.token.string'
      }
    })
  ).toBe('the.token.string')
})

test('getCredentials reads bearer auth header and returns undefined if not present', () => {
  expect(getCredentials({})).toBeUndefined()
})

test('decodeMiddleware reads bearer auth header and, if present, sets decoded jwt payload as ctx.state.jwt', () => {
  const mw = decodeMiddleware({
    secret: 'my-little-secret'
  })
  let ctx = {
    state: {},
    header: {
      authorization:
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ2NTMzMDIxNzksInN0ZXZlIjoibGlsZXMiLCJtYXJrIjoibWFydGlyZXMifQ.KfS-BSKnFR87tJrb0eu43CaaTfE0DG6MOXU5Uic71NI'
    }
  }
  mw(ctx, () => {})
  expect(ctx.state.jwt).toEqual({
    exp: 4653302179,
    steve: 'liles',
    mark: 'martires'
  })
})

test('decodeMiddleware reads bearer auth header and, if not present, does nothing', () => {
  const mw = decodeMiddleware({
    secret: 'my-little-secret'
  })
  let ctx = {
    state: {},
    header: {}
  }
  mw(ctx, () => {})
  expect(ctx.state.jwt).toBeUndefined()
})

test('decodeMiddleware reads auth header but ignores if not Bearer', () => {
  const mw = decodeMiddleware({
    secret: 'my-little-secret'
  })
  let ctx = {
    state: {},
    header: {
      authorization: 'Foo wobble'
    }
  }
  mw(ctx, () => {})
  expect(ctx.state.jwt).toBeUndefined()
})

test('decodeMiddleware invokes next() if there is a jwt', () => {
  const mw = decodeMiddleware({
    secret: 'my-little-secret'
  })
  let ctx = {
    state: {},
    header: {
      authorization:
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ2NTMzMDIxNzksInN0ZXZlIjoibGlsZXMiLCJtYXJrIjoibWFydGlyZXMifQ.KfS-BSKnFR87tJrb0eu43CaaTfE0DG6MOXU5Uic71NI'
    }
  }
  const next = jest.fn()
  mw(ctx, next)
  expect(ctx.state.jwt).toBeDefined()
  expect(next.mock.calls.length).toBe(1)
})

test('decodeMiddleware invokes next() if there is no jwt', () => {
  const mw = decodeMiddleware({
    secret: 'my-little-secret'
  })
  let ctx = {
    state: {},
    header: {}
  }
  const next = jest.fn()
  mw(ctx, next)
  expect(ctx.state.jwt).toBeUndefined()
  expect(next.mock.calls.length).toBe(1)
})
