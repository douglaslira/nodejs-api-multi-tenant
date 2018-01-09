'use strict'

import log from '../../log'
import config from '../../../config'
import { credentials } from '../credentials'
import { hash, isValidPassword, generatePassword } from '../../utils/passwords'
const mongoose = require('mongoose')
const Schema = mongoose.Schema

export const PASSWORD_SALT =
  '265fae7fe0940e8483e248ed9c364fbd75a9119edaaa6deff3394ec4c221f846'

// schema definition ----------------------------------------------------------

const schema = new Schema({
  ...credentials,
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  registered: {
    type: Date,
    required: true,
    default: Date.now
  }
})

// define statics, methods, virtuals using es6 class syntax -------------------

// exported to allow testing
export class AdministratorClass {
  static findByEmail(email) {
    return this.findOne({ email }).exec() // .exec returns a real promise
  }

  static async register(administrator) {
    if (!isValidPassword(administrator.password)) {
      // can't do this with mongoose validator because we're checking the pre-hashed version
      // meets our criteria for a strong password, whereas mongoose would be validating the hash
      throw new Error('invalid_password')
    } else {
      return this.create(
        Object.assign({}, administrator, {
          password: hash(administrator.password, PASSWORD_SALT)
        })
      )
    }
  }

  static async updateRegistration(administrator) {
    const update = { ...administrator }
    if (update.password) {
      if (!isValidPassword(update.password)) throw new Error('invalid password')
      update.password = hash(update.password, PASSWORD_SALT)
    }
    return this.findOneAndUpdate(
      {
        _id: update._id
      },
      update,
      { new: true }
    ).exec()
  }

  static async login(email, password) {
    const administrator = await this.findOne({
      email,
      password: hash(password, PASSWORD_SALT)
    }).exec()
    if (administrator) {
      return administrator
    } else {
      throw new Error('invalid_credentials')
    }
  }
}

schema.loadClass(AdministratorClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('Administrator', schema)
}

export default {
  create
}
