'use strict'

import mongoose from 'mongoose'
import { hash } from '../../utils/passwords'
import { UserClass, PASSWORD_SALT } from './UserFactory'

const LOGIN = { email: 'steve@knowledgeview.co.uk', password: 'p6ssw0rd' }
const REGISTERED = {
  email: LOGIN.email,
  password: hash(LOGIN.password, PASSWORD_SALT)
}
const VERIFIED = {
  email: LOGIN.email,
  password: hash(LOGIN.password, PASSWORD_SALT),
  verified: new Date()
}

// couldn't find a nice automatic way to mock this ... might turn out to be useful to extract something here
const mock = options => {
  class User extends UserClass {
    static findOne(opts) {
      const result = new Promise((resolve, reject) => {
        resolve(options.findOne(opts))
      })
      result.exec = () => result
      return result
    }
    static create(opts) {
      const result = new Promise((resolve, reject) => {
        resolve(options.create(opts))
      })
      result.exec = () => result
      return result
    }
  }
  return User
}

test('login rejects with invalid_credentials when email not registered', () => {
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
    password: REGISTERED.password
  })

  return result
})

test('login rejects with invalid_credentials when incorrect password is provided', () => {
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

test('login rejects with account_not_verified if correct credentials but unverified', () => {
  const findOne = jest.fn()
  findOne.mockReturnValueOnce(REGISTERED)

  const result = expect(
    mock({
      findOne
    }).login(LOGIN.email, LOGIN.password)
  ).rejects.toMatchObject({ message: 'account_not_verified' })

  expect(findOne.mock.calls.length).toBe(1)
  expect(findOne.mock.calls[0].length).toBe(1) // 1 param
  expect(findOne.mock.calls[0][0]).toEqual({
    email: LOGIN.email,
    password: REGISTERED.password
  })

  return result
})

test('login resolves to User when verified and correct password is provided', () => {
  const findOne = jest.fn()
  findOne.mockReturnValueOnce(VERIFIED)

  const result = expect(
    mock({
      findOne
    }).login(LOGIN.email, LOGIN.password)
  ).resolves.toEqual(VERIFIED)

  expect(findOne.mock.calls.length).toBe(1)
  expect(findOne.mock.calls[0].length).toBe(1) // 1 param
  expect(findOne.mock.calls[0][0]).toEqual({
    email: LOGIN.email,
    password: VERIFIED.password
  })

  return result
})
