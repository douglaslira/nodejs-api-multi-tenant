'use strict'

import {
  register,
  confirmWithToken,
  confirmWithPin
} from './register_with_email'
import serialize_profile from '../serialize_profile'
import crypto from 'crypto'
import config from '../../../../config'
import { encoder } from '../../jwt/jwt'

jest.mock('../../../utils/runAsync')

describe('email registration', () => {
  let jwt, pin, ctx, enqueue, userRegister

  beforeEach(() => {
    userRegister = jest.fn().mockImplementation(user => ({
      ...user,
      _id: 'mock-id',
      role: 'test-role',
      registered: '2017-08-14'
    }))
    enqueue = jest.fn()
    // looks a bit like a jwt, but is stable over time :)
    jwt = jest
      .fn()
      .mockImplementation(payload =>
        crypto
          .createHash('sha256')
          .update(JSON.stringify(payload))
          .digest('hex')
      )
    pin = jest.fn().mockImplementation(user => 'abc12')
    ctx = {
      request: {
        body: {
          email: 'test@foo.bar',
          username: 'test-user',
          tags: ['test01', 'test02']
        }
      },
      state: {
        service: {
          domainName: 'test.foo.bar',
          mailer: {
            enqueue
          },
          User: {
            register: userRegister
          }
        }
      }
    }
  })

  it('returns serialized new-user as body when successful', async () => {
    const r = register(jwt, pin)
    await r(ctx)

    expect(ctx.body).toMatchSnapshot()
  })

  it('sets response status 201 (created) when successful', async () => {
    const r = register(jwt, pin)
    await r(ctx)

    expect(ctx.status).toBe(201)
  })

  it('enqueues confirm-registration email when successful', async () => {
    const r = register(jwt, pin)
    await r(ctx)

    expect(enqueue).toBeCalled()
    expect(enqueue.mock.calls[0][0]).toMatchSnapshot()
  })

  it('does not enqueue confirm-registration email when unsuccessful', async () => {
    userRegister.mockImplementation(() => {
      throw new Error('expected')
    })
    try {
      const r = register(jwt)
      await r(ctx)
      throw new Error('not expected - should not reach here')
    } catch (e) {
      expect(e.message).toBe('expected')
    }
    expect(enqueue).not.toBeCalled()
  })
})

describe('confirmWithToken', () => {
  let ctx, User, findOne, thrw, completeRegistration, login, activityStreams
  const token = encoder({
    secret: config.endUserJwtSecret,
    expireInSeconds: 60
  })({
    userId: 'abc123',
    email: 'foo@bar.com'
  })

  beforeEach(() => {
    findOne = jest.fn()
    thrw = jest.fn()
    login = jest.fn()
    activityStreams = {
      followTags: jest.fn()
    }
    completeRegistration = jest.fn()
    ctx = {
      throw: thrw,
      login
    }
    User = {
      findOne,
      completeRegistration
    }
  })

  it('looks up user matching id and email from token', async () => {
    await confirmWithToken(ctx, User, token, activityStreams)
    expect(findOne).toBeCalledWith({ _id: 'abc123', email: 'foo@bar.com' })
  })

  it('returns 400:no_such_user if user not found', async () => {
    findOne.mockImplementation(() => undefined)
    await confirmWithToken(ctx, User, token)

    expect(findOne).toBeCalledWith({ _id: 'abc123', email: 'foo@bar.com' })
    expect(thrw).toBeCalledWith(400, 'no_such_user')
    expect(login).not.toBeCalled()
    expect(activityStreams.followTags).not.toBeCalled()
  })

  it('returns 200 if valid token and user already verified', async () => {
    const user = {
      _id: 'abc123',
      email: 'foo@bar.com',
      verified: new Date()
    }
    findOne.mockImplementation(() => user)
    await confirmWithToken(ctx, User, token, 'my.domain.com', activityStreams)

    expect(findOne).toBeCalledWith({ _id: 'abc123', email: 'foo@bar.com' })
    expect(ctx.status).toBe(200)
    expect(ctx.body).toBeDefined()
    expect(login).toBeCalledWith({ ...user, domain: 'my.domain.com' })
    expect(activityStreams.followTags).not.toBeCalled()
  })

  it('returns 202 if valid token and user not previously verified', async () => {
    const verified = new Date()
    const user = { _id: 'abc123', email: 'foo@bar.com' }
    findOne.mockImplementation(() => user)
    completeRegistration.mockImplementation(u => ({
      ...u,
      verified
    }))
    await confirmWithToken(ctx, User, token, 'my.domain.com', activityStreams)

    expect(findOne).toBeCalledWith({ _id: 'abc123', email: 'foo@bar.com' })
    expect(ctx.status).toBe(202)
    expect(ctx.body).toBeDefined()
    expect(login).toBeCalled()
    expect(login.mock.calls[0][0]).toEqual({
      ...serialize_profile({ ...user, verified }),
      domain: 'my.domain.com'
    })
    expect(activityStreams.followTags).toBeCalled()
  })

  it('follows initial tags if user is verified successfully', async () => {
    const verified = new Date()
    const user = {
      _id: 'abc123',
      email: 'foo@bar.com',
      initial_tags: ['Foo', 'Bar']
    }
    findOne.mockImplementation(() => user)
    completeRegistration.mockImplementation(u => ({
      ...u,
      verified
    }))
    await confirmWithToken(ctx, User, token, 'my.domain.com', activityStreams)
    expect(activityStreams.followTags).toBeCalledWith(['Foo', 'Bar'], 'abc123')
  })
})

describe('confirmWithPin', () => {
  let ctx,
    User,
    pinFn,
    findById,
    thrw,
    completeRegistration,
    login,
    activityStreams

  beforeEach(() => {
    thrw = jest.fn()
    findById = jest.fn()
    pinFn = jest.fn()
    login = jest.fn()
    completeRegistration = jest.fn()
    activityStreams = {
      followTags: jest.fn()
    }
    User = {
      findById,
      completeRegistration
    }
    ctx = {
      login,
      throw: thrw
    }
  })

  it('looks up user with matching id', async () => {
    await confirmWithPin(ctx, User, pinFn, 'abc123', '1234')

    expect(findById).toBeCalledWith('abc123')
  })

  it('returns 400:no_such_user if user not found', async () => {
    findById.mockImplementation(() => undefined)
    await confirmWithPin(ctx, User, pinFn, 'abc123', '1234')

    expect(findById).toBeCalledWith('abc123')
    expect(thrw).toBeCalledWith(400, 'no_such_user')
    expect(login).not.toBeCalled()
    expect(activityStreams.followTags).not.toBeCalled()
  })

  it('returns 400:invalid_pin if pin doesnt match new pin created from user', async () => {
    findById.mockImplementation(() => ({ _id: 'abc123', email: 'foo@bar.com' }))
    pinFn.mockImplementation(() => 'valid-pin')
    await confirmWithPin(ctx, User, pinFn, 'abc123', 'invalid-pin')

    expect(findById).toBeCalledWith('abc123')
    expect(thrw).toBeCalledWith(400, 'invalid_pin')
    expect(login).not.toBeCalled()
    expect(activityStreams.followTags).not.toBeCalled()
  })

  it('returns 200 if valid pin but user already verified', async () => {
    const user = { _id: 'abc123', email: 'foo@bar.com', verified: new Date() }
    findById.mockImplementation(() => user)
    pinFn.mockImplementation(() => 'valid-pin')
    completeRegistration.mockImplementation(() => user)
    await confirmWithPin(
      ctx,
      User,
      pinFn,
      'abc123',
      'valid-pin',
      'my.domain.com',
      activityStreams
    )

    expect(findById).toBeCalledWith('abc123')
    expect(ctx.status).toBe(200)
    expect(ctx.body).toBeDefined()
    expect(login).toBeCalledWith({ ...user, domain: 'my.domain.com' })
    expect(activityStreams.followTags).not.toBeCalled()
  })

  it('invokes `completeRegistration` to set verified date of user if valid pin and not previously verified', async () => {
    const user = { _id: 'abc123', email: 'foo@bar.com' }
    findById.mockImplementation(() => user)
    pinFn.mockImplementation(() => 'valid-pin')
    completeRegistration.mockImplementation(() => user)
    await confirmWithPin(
      ctx,
      User,
      pinFn,
      'abc123',
      'valid-pin',
      'my.domain.com',
      activityStreams
    )

    expect(completeRegistration).toBeCalledWith(user)
    expect(login).toBeCalledWith({ ...user, domain: 'my.domain.com' })
  })

  it('returns 202 if valid pin and user not previously verified', async () => {
    const user = { _id: 'abc123', email: 'foo@bar.com' }
    findById.mockImplementation(() => user)
    pinFn.mockImplementation(() => 'valid-pin')
    completeRegistration.mockImplementation(() => user)
    await confirmWithPin(
      ctx,
      User,
      pinFn,
      'abc123',
      'valid-pin',
      'my.domain.com',
      activityStreams
    )

    expect(findById).toBeCalledWith('abc123')
    expect(ctx.status).toBe(202)
    expect(ctx.body).toBeDefined()
    expect(login).toBeCalledWith({ ...user, domain: 'my.domain.com' })
    expect(activityStreams.followTags).toBeCalled()
  })

  it('follows initial tags if user is verified successfully', async () => {
    const user = {
      _id: 'abc123',
      email: 'foo@bar.com',
      initial_tags: ['Foo', 'Bar']
    }
    findById.mockImplementation(() => user)
    pinFn.mockImplementation(() => 'valid-pin')
    completeRegistration.mockImplementation(() => user)
    await confirmWithPin(
      ctx,
      User,
      pinFn,
      'abc123',
      'valid-pin',
      'my.domain.com',
      activityStreams
    )
    expect(activityStreams.followTags).toBeCalledWith(['Foo', 'Bar'], 'abc123')
  })
})
