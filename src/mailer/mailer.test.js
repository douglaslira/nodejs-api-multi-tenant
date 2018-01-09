'use strict'

import Mailer, { EVENT_TYPE, DEFAULT_MAX_ATTEMPTS } from './mailer'

describe('enqueue', () => {
  let mailer, pubsub, publish, subscribe, transport, ack, formatter
  let log = console.log
  global.console = { log: log, warn: jest.fn(), error: jest.fn() }

  beforeEach(() => {
    publish = jest.fn()
    subscribe = jest.fn()
    transport = { send: jest.fn(), init: jest.fn() }
    formatter = { format: jest.fn() }
    ack = jest.fn()
    pubsub = { publish, subscribe }
    mailer = new Mailer(pubsub, transport, formatter)
  })

  it('enqueues a mail', () => {
    mailer.enqueue({
      to: 'joebloggs@somedomain.com',
      from: 'system@newssocial.co.uk',
      type: 'some-mail-type',
      payload: {
        foo: 'bar',
        whiz: 'bang'
      }
    })
    expect(publish.mock.calls[0][0]).toBe(EVENT_TYPE)
    expect(publish.mock.calls[0][1]).toMatchSnapshot()
  })

  it('subscribes to `email-enqueued` messages', () => {
    transport.init.mockImplementation(cb => cb())
    mailer.handleQueue()
    expect(subscribe).toBeCalled()
  })

  it('dispatches mails via transport', async () => {
    const mail = {}
    await transport.send(mail)
    ack.mockImplementation(cb => {
      cb()
    })
    await mailer.dispatch('event', {}, ack)
    expect(transport.send).toBeCalled()
    expect(transport.send.mock.calls[0][0]).toEqual(mail)
  })

  it('acks events after dispatch', async () => {
    const mail = {}
    await transport.send(mail)
    ack.mockImplementation(cb => {
      cb()
    })
    await mailer.dispatch('event', {}, ack)
    expect(ack).toBeCalled()
  })

  it('ignores mails with too many failed attempts', () => {
    transport.init.mockImplementation(cb => cb())
    mailer.handleQueue()
    expect(subscribe).toBeCalled()
    const registeredCallback = subscribe.mock.calls[0][2]
    expect(registeredCallback).toBeDefined()
    const mail = { attempts: DEFAULT_MAX_ATTEMPTS }
    registeredCallback('event-name', mail, ack)
    expect(transport.send).not.toBeCalled()
    expect(global.console.warn).toBeCalled()
  })

  it('acks events with too many failed attempts', () => {
    transport.init.mockImplementation(cb => cb())
    mailer.handleQueue()
    expect(subscribe).toBeCalled()
    const registeredCallback = subscribe.mock.calls[0][2]
    expect(registeredCallback).toBeDefined()
    const mail = { attempts: DEFAULT_MAX_ATTEMPTS }
    registeredCallback('event-name', mail, ack)
    expect(ack).toBeCalled()
    expect(global.console.warn).toBeCalled()
  })

  it('increments attempts, re-enqueues, acks, and propagates error when send fails', async () => {
    const mail = {}
    transport.send.mockImplementation(m => {
      throw new Error('expected')
    })
    formatter.format.mockReturnValueOnce(mail)
    ack.mockImplementation(cb => {
      cb()
    })

    try {
      await mailer.dispatch('event', mail, ack)
      throw new Error('unexpected')
    } catch (err) {
      expect(global.console.error).toBeCalledWith(err)
      expect(err.message).toBe('expected')
    }
    expect(pubsub.publish.mock.calls[0][1]).toEqual({ attempts: 1 })
    expect(transport.send).toBeCalled()
    expect(transport.send.mock.calls[0][0]).toEqual(mail)
  })

  it('formats mail via formatter', async () => {
    const mail = {
      foo: 'foo',
      bar: 'bar'
    }
    ack.mockImplementation(cb => {
      cb()
    })
    await mailer.dispatch('event', mail, ack)
    expect(formatter.format).toBeCalledWith(mail)
  })
})
