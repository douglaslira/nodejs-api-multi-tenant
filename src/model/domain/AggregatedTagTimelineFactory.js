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
  modified: {
    type: Date,
    required: true,
    default: Date.now
  },
  day: {
    type: String,
    required: true
  },
  posts: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Post'
    }
  ]
})

schema.index({ tag: 1, follower: 1 }, { unique: true })

// define statics, methods, virtuals using es6 class syntax -------------------

export class AggregatedTagTimelineClass {
  // exported to allow testing
}

schema.loadClass(AggregatedTagTimelineClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('AggregatedTagTimeline', schema)
}

export default {
  create
}
