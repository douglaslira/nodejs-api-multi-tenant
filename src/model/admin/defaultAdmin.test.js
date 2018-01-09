'use strict'

import { ensureDefaultAdminUserExists } from './defaultAdmin'

test('ensureDefaultAdminUserExists does nothing if already exists', async () => {
  const findByEmail = jest.fn()
  findByEmail.mockReturnValueOnce(Promise.resolve('email'))

  const result = await ensureDefaultAdminUserExists({ findByEmail })

  expect(result).toBe('email')
  expect(findByEmail.mock.calls.length).toBe(1)

  return result
})

test('ensureDefaultAdminUserExists registers a new user if not exists', async () => {
  const findByEmail = jest.fn()
  findByEmail.mockReturnValueOnce()
  const register = jest.fn()
  register.mockReturnValueOnce(Promise.resolve('registered'))

  const result = await ensureDefaultAdminUserExists({ findByEmail, register })

  expect(result).toBe('registered')
  expect(findByEmail.mock.calls.length).toBe(1)
  expect(register.mock.calls.length).toBe(1)

  return result
})
