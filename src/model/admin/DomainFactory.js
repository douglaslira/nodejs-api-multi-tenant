'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

import imageSchema from '../attachment'
import log from '../../log'
import config from '../../../config'

// schema definition ----------------------------------------------------------

const schema = new Schema({
  domainName: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Administrator'
  },
  smallLogo: {
    type: imageSchema,
    required: true
  },
  largeLogo: {
    type: imageSchema,
    required: true
  },
  facebookAppId: {
    type: String
  },
  facebookAppSecret: {
    type: String
  },
  getStreamKey: {
    type: String
  },
  getStreamSecret: {
    type: String
  }
})

// define statics, methods, virtuals using es6 class syntax -------------------

export class DomainClass {
  static findByDomainName(domainName) {
    return this.findOne({}).populate().exec()
  }
}

schema.loadClass(DomainClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('Domain', schema)
}

export default {
  create
}
