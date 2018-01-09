'use strict'

import { hash } from '../../utils/passwords'
import { AdministratorClass, PASSWORD_SALT } from './AdministratorFactory'

const LOGIN = { email: 'steve@knowledgeview.co.uk', password: 'p6ssw0rd' }
const REGISTERED = {
  email: LOGIN.email,
  password: hash(LOGIN.password, PASSWORD_SALT)
}

// couldn't find a nice automatic way to mock this ... might turn out to be useful to extract something here
const mock = options => {
  class Adminstrator extends AdministratorClass {
    static findOne(opts) {
      const result = new Promise((resolve, reject) => {
        resolve(options.findOne(opts))
      })
      result.exec = () => result
      return result
    }
  }
  return Adminstrator
}

test('login resolves to undefined when email not registered', () => {
  const findOne = jest.fn()
  findOne.mockReturnValueOnce(undefined) // ie., not present in db

  const result = expect(
    mock({
      findOne
    }).login(LOGIN.email, LOGIN.password)
  ).rejects.toMatchObject({ message: 'invalid_credentials' })

  expect(findOne.mock.calls.length).toBe(1)
  expect(findOne.mock.calls[0].length).toBe(1) // 1 param
  expect(findOne.mock.calls[0][0]).toEqual({
    email: LOGIN.email,
    password: REGISTERED.password // hashed
  })

  return result
})

test('login resolves to undefined when incorrect password is provided', () => {
  const findOne = jest.fn()
  findOne.mockReturnValueOnce(undefined)

  const result = expect(
    mock({
      findOne
    }).login(LOGIN.email, 'wrong password')
  ).rejects.toMatchObject({ message: 'invalid_credentials' })

  expect(findOne.mock.calls.length).toBe(1)
  expect(findOne.mock.calls[0].length).toBe(1) // 1 param
  expect(findOne.mock.calls[0][0]).toEqual({
    email: LOGIN.email,
    password: hash('wrong password', PASSWORD_SALT)
  })

  return result
})

test('login resolves to Adminstrator when correct password is provided', () => {
  const findOne = jest.fn()
  findOne.mockReturnValueOnce(REGISTERED)

  const result = expect(
    mock({
      findOne
    }).login(LOGIN.email, LOGIN.password)
  ).resolves.toEqual(REGISTERED)

  expect(findOne.mock.calls.length).toBe(1)
  expect(findOne.mock.calls[0].length).toBe(1) // 1 param
  expect(findOne.mock.calls[0][0]).toEqual({
    email: LOGIN.email,
    password: REGISTERED.password
  })

  return result
})
