'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

import log from '../../log'
import config from '../../../config'

// schema definition ----------------------------------------------------------

const schema = new Schema({
  language: {
    type: String,
    required: true,
    unique: true
  },
  tags: [
    {
      type: String
    }
  ]
})

// define statics, methods, virtuals using es6 class syntax -------------------

export class OnboardingTagsClass {}

schema.loadClass(OnboardingTagsClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('OnboardingTags', schema)
}

export default {
  create
}
