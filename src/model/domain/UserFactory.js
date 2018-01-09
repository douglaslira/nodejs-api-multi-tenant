'use strict'

import log from '../../log'
import config from '../../../config'
import { credentials } from '../credentials'
import { hash, generatePassword, isValidPassword } from '../../utils/passwords'
import imageSchema from '../attachment'
import ROLES, { ROLE_NAMES } from './roles'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

const MAX_SUGGESTIONS = 6

export const PASSWORD_SALT =
  'cf37adbdf30b4ff77be427105e0db98b7aa73182b9124bb0483139e19329814a'

// schema definition ----------------------------------------------------------

const schema = new Schema({
  ...credentials,
  username: {
    type: String,
    required: true,
    unique: 'username_already_registered'
  },
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  gender: {
    type: String
  },
  locale: {
    value: {
      type: String
    },
    language: {
      type: String
    },
    region: {
      type: String
    }
  },
  facebookUserId: {
    type: String,
    unique: 'facebook_account_already_registered',
    sparse: true
  },
  avatar: new Schema(imageSchema),
  registered: {
    type: Date,
    required: true,
    default: Date.now
  },
  verified: {
    type: Date
  },
  role: {
    type: String,
    enum: ROLE_NAMES,
    required: true,
    default: ROLES.USER
  },
  bio: {
    type: String
  },
  initial_tags: [String] // initial tag selection during registration
})

// define statics, methods, virtuals using es6 class syntax -------------------

export class UserClass {
  // exported to allow testing

  static async register(user) {
    if (!user.facebookUserId && !isValidPassword(user.password)) {
      // can't do this with mongoose validator because we're checking the pre-hashed version
      // meets our criteria for a strong password, whereas mongoose would be validating the hash
      throw new Error('invalid_password')
    } else {
      return this.create(
        Object.assign({}, user, {
          password: user.password && hash(user.password, PASSWORD_SALT)
        })
      )
    }
  }

  static async completeRegistration({ _id, email }) {
    return await this.findOneAndUpdate(
      {
        _id,
        email
      },
      {
        verified: new Date()
      },
      {
        new: true,
        upsert: false
      }
    ).exec()
  }

  static updateRegistration(user) {
    const update = { ...user }
    if (update.password) {
      if (!isValidPassword(update.password)) throw new Error('invalid_password')
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
    const user = await this.findOne({
      email,
      password: hash(password, PASSWORD_SALT)
    }).exec()
    if (user) {
      if (user.verified) {
        return user
      } else {
        throw new Error('account_not_verified')
      }
    } else {
      throw new Error('invalid_credentials')
    }
  }

  static findByEmail(email) {
    return this.findOne({ email }).exec()
  }

  static findByUsername(username) {
    return this.findOne({ username }).exec()
  }

  static suggest(filter) {
    const [firstname, lastname] = filter.split(' ')
    if (lastname && lastname.length) {
      return this.find({
        $or: [
          { username: new RegExp(`^${filter}`, 'i') },
          {
            $and: [
              { firstname: new RegExp(`^${firstname}`, 'i') },
              { lastname: new RegExp(`^${lastname}`, 'i') }
            ]
          }
        ]
      })
        .limit(MAX_SUGGESTIONS)
        .exec()
    } else {
      return this.find({
        $or: [
          { username: new RegExp(`^${filter}`, 'i') },
          { firstname: new RegExp(`^${firstname}`, 'i') }
        ]
      })
        .limit(MAX_SUGGESTIONS)
        .exec()
    }
  }
}

schema.loadClass(UserClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('User', schema)
}

export default {
  create
}
