'use strict'

import log from '../../log'
import config from '../../../config'
import attachmentSchema from '../attachment'
import { createRange } from '../../utils/ranges'
const mongoose = require('mongoose')
const Schema = mongoose.Schema

// schema definition ----------------------------------------------------------

// note: an alternative/better way of representing this might be:
//  - store versions of drafts
//  - make the published post a pointer to a specific draft version

const schema = new Schema({
  name: {
    // used in the URL, cannot be modified else the article will move and break people's bookmarks!
    type: String,
    required: true
  },
  draft: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Draft'
  },
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
  readTime: {
    type: Number,
    required: true
  },
  thread: [Schema.Types.ObjectId],
  responseCount: {
    type: Number,
    default: 0
  }
  // types other than article may include many more fields ... either include as optional here,
  // or use a discriminator and alternative schema's per POST type ...
})

schema.index({ name: 1 })
schema.index({ author: 1 })
schema.index({ thread: 1 })

// define statics, methods, virtuals using es6 class syntax -------------------

const mapById = records => {
  return records.reduce((result, record) => {
    result[record._id] = record
    return result
  }, {})
}

export const mapByThread = responses => {
  let result = {}
  responses.forEach(r => {
    let parent = result
    r.thread.slice(1).forEach(t => {
      if (!parent[t]) parent[t] = { _id: t, responses: {} }
      parent = parent[t].responses
    })
    parent[r._id] = { ...r, responses: {} }
  })
  return result
}

export const threadMapToConversation = map => {
  const names = Object.getOwnPropertyNames(map)
  return names.map(id => {
    return { ...map[id], responses: threadMapToConversation(map[id].responses) }
  })
}

export const toConversations = responses => {
  return threadMapToConversation(mapByThread(responses))
}

const getUsersMappedById = async (userIds, User) => {
  return mapById(await User.find({ _id: { $in: userIds } }).exec())
}

export class PostClass {
  // exported to allow testing
  static async findConversations(respondingTo, { limit, skip }, User) {
    // count all top-level responses
    const countQuery = this.count({
      $and: [{ thread: { $size: 1 } }, { thread: respondingTo }]
    })
    // find all top-level responses, ordered by most responses (to the response) first
    const postsQuery = this.find({
      $and: [{ thread: { $size: 1 } }, { thread: respondingTo }]
    })
      .skip(skip)
      .limit(limit)
      .sort({ responseCount: -1 })
    const [count, posts] = await Promise.all([countQuery, postsQuery])
    // potentially hefty ... could limit this in the same way as the initial postsQuery, e.g.
    // { $and: [ { thread: { $size: N }}, { thread: { $in: posts.map(p => p._id) } }] }
    const responses = await this.find({
      thread: {
        $in: posts.map(p => p._id)
      }
    }).sort({ created: -1 })
    const all = posts.concat(responses)
    let authors = all.length
      ? await getUsersMappedById(all.map(p => p.author), User)
      : {}
    const conversations = toConversations(all.map(r => r._doc))
    return {
      values: conversations,
      range: createRange(skip, posts, count),
      extra: {
        authors
      }
    }
  }
}

schema.loadClass(PostClass)

// factory method -------------------------------------------------------------
// -- enables unit testing without connecting to mongo
// -- enables creating the same models in _different_ mongo databases

const create = db => {
  return db.model('Post', schema)
}

export default {
  create
}
