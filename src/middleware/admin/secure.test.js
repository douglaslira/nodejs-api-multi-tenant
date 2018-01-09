'use strict'

import { ADMIN_LOGIN_ENDPOINT } from '../login'
import init, { isProtectedAdminRequest, isLoggedIn, secureAPIs } from './secure'

test('isProtectedAdminRequest does not match admin login endpoint', () => {
  expect(
    isProtectedAdminRequest({ url: ADMIN_LOGIN_ENDPOINT, method: 'POST' })
  ).toBe(false)
})

test('isProtectedAdminRequest matches all other requests', () => {
  expect(isProtectedAdminRequest({ url: 'whatevs', method: 'POST' })).toBe(true)
  expect(isProtectedAdminRequest({ url: 'yep', method: 'PUT' })).toBe(true)
  expect(
    isProtectedAdminRequest({ url: 'thassriiiight', method: 'DELETE' })
  ).toBe(true)
  expect(isProtectedAdminRequest({ url: 'inittho', method: 'GET' })).toBe(true)
})

test('isLoggedIn is true if a user is present', () => {
  expect(isLoggedIn({ state: { user: {} } })).toBe(true)
})

test('isLoggedIn is false if a user is not present', () => {
  expect(isLoggedIn({ state: {} })).toBe(false)
})

test(`secureAPIs does not invoke next if unauthenticated`, async () => {
  const next = jest.fn()
  const throws = jest.fn()
  const ctx = {
    state: {},
    throw: throws,
    method: 'GET',
    url: '/foo'
  }
  await secureAPIs(ctx, next)
  expect(next).not.toBeCalled()
  expect(throws).toBeCalledWith(401, 'authentication_required')
})

test(`secureAPIs does invoke next if authenticated`, async () => {
  const next = jest.fn()
  const throws = jest.fn()
  const ctx = {
    state: {
      user: {
        // whatev's
      }
    },
    throw: throws,
    method: 'GET',
    url: '/foo'
  }
  await secureAPIs(ctx, next)
  expect(next).toBeCalled()
  expect(throws).not.toBeCalled()
})

test('init registers all middleware', () => {
  const app = { use: jest.fn() }
  init(app)
  expect(app.use.mock.calls.length).toBe(1)
  // stacking order of middleware is important!
  expect(app.use.mock.calls[0][0]).toBe(secureAPIs)
})
