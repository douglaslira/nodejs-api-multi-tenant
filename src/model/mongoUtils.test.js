'use strict'

import {
  extractMongoOpts,
  readyQueue,
  createConnectionString
} from './mongoUtils'

test('extractMongoOpts filters config entries prefixed with `mongo`, returns new json without prefixes', () => {
  expect(
    extractMongoOpts({
      mongoFoo: 'bar',
      cheese: 'cheddar',
      mongoWhiz: 'bang',
      fruit: 'no thanks'
    })
  ).toEqual({
    foo: 'bar',
    whiz: 'bang'
  })
})

test('createConnectionString creates correct connection string when credentials are not specified', () => {
  expect(
    createConnectionString({
      hosts: 'mongo1:27017,mongo2:27017,mongo3:27017',
      replicaset: 'replica-set',
      database: 'database',
      user: undefined,
      password: undefined,
      ssl: true
    })
  ).toBe(
    'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/database?ssl=true&replicaSet=replica-set'
  )
})

test('createConnectionString creates correct connection string when credentials are specified', () => {
  expect(
    createConnectionString({
      hosts: 'mongo1:27017,mongo2:27017,mongo3:27017',
      replicaset: 'replica-set',
      database: 'database',
      user: 'user',
      password: 'password',
      ssl: true
    })
  ).toBe(
    'mongodb://user:password@mongo1:27017,mongo2:27017,mongo3:27017/database?ssl=true&replicaSet=replica-set&authSource=admin'
  )
})

test('createConnectionString creates correct connection when no credentials, no ssl, no replica-set', () => {
  expect(
    createConnectionString({
      hosts: 'mongo1:27017',
      replicaset: undefined,
      database: 'database',
      user: undefined,
      password: undefined,
      ssl: false
    })
  ).toBe('mongodb://mongo1:27017/database?ssl=false')
})

test('readyQueue calls `ensureIndexes` on all given models', async () => {
  const ensureIndexes = jest.fn()
  const model = name => {
    return {
      modelName: name,
      ensureIndexes,
      on: (ev, cb) => {
        cb()
      }
    }
  }
  await readyQueue(['a', 'b', 'c', 'd', 'e'].map(model))
  expect(ensureIndexes.mock.calls.length).toBe(5)
})

test('readyQueue waits for `index` event on all given models', async () => {
  const ensureIndexes = jest.fn()
  let count = 0
  const model = name => {
    return {
      modelName: name,
      ensureIndexes,
      on: (ev, cb) => {
        process.nextTick(() => count++)
        process.nextTick(cb)
      }
    }
  }
  const promise = readyQueue(['a', 'b', 'c'].map(model))
  expect(count).toBe(0)
  const result = await promise
  expect(result).toBeUndefined()
  expect(count).toBe(3)
})
