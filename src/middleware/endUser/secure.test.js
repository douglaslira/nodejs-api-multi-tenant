'use strict'

import { END_USER_LOGIN_ENDPOINT } from '../login'
import init, {
  isProtectedEndUserRequest,
  isLoggedIn,
  secureAPIs
} from './secure'

test('isProtectedEndUserRequest does not match POST to end-user login endpoint', () => {
  expect(isProtectedEndUserRequest({ url: '/ua/login', method: 'POST' })).toBe(
    false
  )
})

test('isProtectedEndUserRequest does not match POST to end-user email-registration endpoint', () => {
  expect(
    isProtectedEndUserRequest({ url: '/ua/users/_new/email', method: 'POST' })
  ).toBe(false)
})

test('isProtectedEndUserRequest does not match POST to end-user facebook-registration endpoint', () => {
  expect(
    isProtectedEndUserRequest({
      url: '/ua/users/_new/facebook',
      method: 'POST'
    })
  ).toBe(false)
})

test('isProtectedEndUserRequest matches all other non-GET requests', () => {
  expect(isProtectedEndUserRequest({ url: 'whatevs', method: 'POST' })).toBe(
    true
  )
  expect(isProtectedEndUserRequest({ url: 'yep', method: 'PUT' })).toBe(true)
  expect(
    isProtectedEndUserRequest({ url: 'thassriiiight', method: 'DELETE' })
  ).toBe(true)
})

test('isProtectedEndUserRequest does not match GET requests', () => {
  expect(isProtectedEndUserRequest({ url: '/anything', method: 'GET' })).toBe(
    false
  )
  expect(isProtectedEndUserRequest({ url: '/profile', method: 'GET' })).toBe(
    false
  )
})

test('isLoggedIn is true if a user is present', () => {
  expect(isLoggedIn({ state: { user: {} } })).toBe(true)
})

test('isLoggedIn is false if a user is not present', () => {
  expect(isLoggedIn({ state: {} })).toBe(false)
})

test('secureAPIs invokes next if GET request', () => {
  const next = jest.fn()
  const ctx = {
    method: 'GET',
    url: '/whatever'
  }
  secureAPIs(ctx, next)
  expect(next).toBeCalled()
})

test(`secureAPIs does not invoke next if unauthenticated POST request`, async () => {
  const next = jest.fn()
  const throws = jest.fn()
  const ctx = {
    state: {},
    throw: throws,
    method: 'POST',
    url: '/foo'
  }
  await secureAPIs(ctx, next)
  expect(next).not.toBeCalled()
  expect(throws).toBeCalledWith(401, 'authentication_required')
})

test(`secureEndUserAPIs does invoke next if authenticated POST request`, async () => {
  const next = jest.fn()
  const throws = jest.fn()
  const ctx = {
    state: {
      user: {
        // whatev's
      }
    },
    throw: throws,
    method: 'POST',
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
