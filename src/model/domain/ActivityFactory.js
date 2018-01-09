'use strict'

import log from '../../log'
import config from '../../../config'
import attachmentSchema from '../attachment'
const mongoose = require('mongoose')
const Schema = mongoose.Schema

// schema definition ----------------------------------------------------------

// note: an alternative/better way of representing this might be:
//  - store versions of drafts
//  - make the published post a pointer to a specific draft version

const schema = new Schema({
  entityType: {
    type: String,
    enum: ['user', 'group', 'tag'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  activity: {
    type: Schema.Types.Mixed
  }
})

// define statics, methods, virtuals using es6 class syntax -------------------

export class ActivityClass {
  // exported to allow testing
}

schema.loadClass(ActivityClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('Activity', schema)
}

export default {
  create
}
