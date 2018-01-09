'use strict'

import log from '../../log'
const mongoose = require('mongoose')
const Schema = mongoose.Schema

// schema definition ----------------------------------------------------------

const schema = new Schema({
  followed: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  follower: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  when: {
    type: Date,
    default: Date.now,
    required: true
  }
})

schema.index({ followed: 1, follower: 1 }, { unique: true })

// define statics, methods, virtuals using es6 class syntax -------------------

export class UserFollowersClass {
  // exported to allow testing
}

schema.loadClass(UserFollowersClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('UserFollowers', schema)
}

export default {
  create
}
