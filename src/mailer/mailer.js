'use strict'

export const EVENT_TYPE = 'email-enqueued'
export const DEFAULT_MAX_ATTEMPTS = 5

class Mailer {
  constructor(pubsub, transport, formatter, opts) {
    this.pubsub = pubsub
    this.transport = transport
    this.formatter = formatter
    this.max_attempts = (opts && opts.max_attempts) || DEFAULT_MAX_ATTEMPTS
  }
  async enqueue(mail) {
    return new Promise((resolve, reject) => {
      this.pubsub.publish(EVENT_TYPE, mail, err => {
        if (err) {
          console.error(`error while enqueuing ${mail.type} mail`, err, mail)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  handleQueue() {
    this.transport.init(() => {
      this.pubsub.subscribe(
        EVENT_TYPE,
        {
          name: 'email-handler',
          replay: true
        },
        this.dispatch.bind(this)
      )
    })
  }
  async dispatch(ev, mail, ack) {
    try {
      if (!mail.attempts || mail.attempts < this.max_attempts) {
        const result = await this.transport.send(this.formatter.format(mail))
      } else {
        console.warn('ignoring - too many failed attempts', mail)
      }
      await this.doAck(ack)
    } catch (err) {
      console.error(err)
      // increment number of attempts, re-enqueue, then crash
      // note: we have to get mail delivery out of the API process ASAP
      // to avoid crashing the API when there is a failed delivery!
      this.enqueue({
        ...mail,
        attempts: mail.attempts ? mail.attempts + 1 : 1
      })
      try {
        await this.doAck(ack)
      } catch (ackErr) {
        if (err) {
          // there was a mail error first, so we're going to log the ack error and
          // propagate the mail error ...
          console.error(ackErr)
        } else {
          throw ackErr
        }
      }
      throw err
    }
  }
  async doAck(ack) {
    return new Promise((resolve, reject) => {
      ack(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

export default Mailer
