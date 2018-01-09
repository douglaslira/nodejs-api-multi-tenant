'use strict'

import { credentials } from './credentials'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema(credentials)
const Credentials = mongoose.model('Credentials', schema)

test('credentials accepts valid email address and password', () => {
  const c = new Credentials({
    email: 'steve@knowledgeview.co.uk',
    password: 'abcd1234'
  })
  expect(c.validateSync()).toBeUndefined()
})

test('credentials errors on invalid email addresses', () => {
  const c = new Credentials({ email: 'steve@foo', password: 'abcd1234' })
  const result = c.validateSync().errors
  expect(result).toBeDefined()
  expect(result.email).toBeDefined()
  expect(result.email.message).toBe('invalid_email_address')
})
