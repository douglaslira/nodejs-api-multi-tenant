'use strict'

import log from '../../log'
import config from '../../../config'
import attachmentSchema from '../attachment'
const mongoose = require('mongoose')
const Schema = mongoose.Schema

// schema definition ----------------------------------------------------------

const schema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['article', 'event'] // todo: other types, later
  },
  author: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  title: {
    type: String
  },
  image: new Schema(attachmentSchema),
  language: {
    type: String,
    required: true
  },
  content: {
    type: Schema.Types.Mixed,
    required: true
  },
  attachments: [attachmentSchema],
  tags: [String],
  created: {
    type: Date,
    required: true,
    default: Date.now
  },
  modified: {
    type: Date,
    required: true,
    default: Date.now
  },
  responseTo: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  }
  // types other than article may include many more fields ... either include as optional here,
  // or use a discriminator and alternative schema's per POST type ...
})

schema.index({ author: 1, created: -1 })

// define statics, methods, virtuals using es6 class syntax -------------------

export class DraftClass {
  // exported to allow testing
}

schema.loadClass(DraftClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('Draft', schema)
}

export default {
  create
}
