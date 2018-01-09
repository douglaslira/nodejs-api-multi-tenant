import config from '../../config'
import nodemailer from 'nodemailer'

const transportConfig = {
  pool: config.smtpUsePool,
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false, // ie., use StartTLS
  auth: {
    user: config.smtpUsername,
    pass: config.smtpPassword
  }
}

const nm_transport = nodemailer.createTransport(transportConfig)

let onReady = []

class Transport {
  constructor() {
    this.ready = false
  }
  init(cb) {
    if (this.ready) {
      cb()
    } else {
      nm_transport.verify((error, success) => {
        if (error) {
          console.error('SMTP transport error', error)
          cb(error)
        } else {
          this.ready = true
          console.log('SMTP transport ready')
          cb()
        }
      })
    }
  }
  async send(mail) {
    return new Promise((resolve, reject) => {
      nm_transport.sendMail(mail, (err, info) => {
        if (err) {
          reject(err)
        } else {
          resolve(info)
        }
      })
    })
  }
}

export default new Transport()
