'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

// schema definition ----------------------------------------------------------

const schema = new Schema({
  tag: {
    type: String,
    required: true
  },
  follower: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  post: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Post'
  }
})

schema.index({ tag: 1, follower: 1, post: 1 }, { unique: true })

// define statics, methods, virtuals using es6 class syntax -------------------

export class TagTimelineClass {
  // exported to allow testing
}

schema.loadClass(TagTimelineClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('TagTimeline', schema)
}

export default {
  create
}
