'use strict'

import mongoose from 'mongoose'
const ValidationError = mongoose.Error.ValidationError
import serialize_profile from '../serialize_profile'
import crypto from 'crypto'
import { createRange } from '../../../utils/ranges'

const summarize_post = function(post) {
  return {
    _id: post._id,
    name: post.name,
    draft: post.draft,
    type: post.type,
    language: post.language,
    title: post.title,
    image: post.image,
    author: serialize_profile(post.author),
    modified: post.modified,
    created: post.created,
    tags: post.tags,
    readTime: post.readTime
  }
}

const serialize_post = function(post) {
  return {
    _id: post._id,
    name: post.name,
    draft: post.draft,
    type: post.type,
    language: post.language,
    title: post.title,
    content: post.content,
    image: post.image,
    author: serialize_profile(post.author),
    modified: post.modified,
    created: post.created,
    tags: post.tags,
    readTime: post.readTime
  }
}

const init = (router, services) => {
  const handleError = function(ctx, err) {
    if (err instanceof ValidationError) {
      ctx.status = 400
      ctx.body = err
    } else {
      ctx.throw(500, err.message, err)
    }
  }

  router.get('/posts/:id', async (ctx, next) => {
    const { state: { user } } = ctx
    const { state: { domain, service: { Post } }, params: { id } } = ctx
    try {
      const result = await Post.findById(id).populate('author').exec()
      if (result) {
        // todo: when we have groups we will need to check that the post is viewable by the current user
        ctx.body = serialize_post(result)
      } else {
        ctx.throw(404, 'no_such_post')
      }
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.get('/users/:username/posts/:postname', async (ctx, next) => {
    const { state: { user } } = ctx
    const {
      state: { domain, service: { Post, User } },
      params: { username, postname }
    } = ctx
    try {
      let author = await User.findByUsername(username)
      const query = {
        author: author._id,
        name: postname
      }
      if (author) {
        const result = await Post.findOne(query).exec()
        if (result) {
          // todo: when we have groups we will need to check that the post is viewable by the current user
          ctx.body = serialize_post({
            ...result._doc,
            author: author
          })
        } else {
          ctx.throw(404, 'no_such_post')
        }
      } else {
        ctx.throw(404, 'no_such_author')
      }
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.get('/users/:author/posts/:filter/:start-:end', async (ctx, next) => {
    const { state: { user } } = ctx
    const {
      state: { domain, service: { Post } },
      params: { author, filter, start, end }
    } = ctx
    if (filter !== '_ALL') {
      ctx.throw(500, 'todo - filters for posts are not currently supported')
    } else {
      const skip = parseInt(ctx.params.start) - 1
      const limit = parseInt(ctx.params.end) - skip
      const query = { author }
      try {
        const count = await Post.count(query).exec()
        const result = await Post.find(query)
          .select({
            _id: 1,
            name: 1,
            type: 1,
            draft: 1,
            language: 1,
            title: 1,
            image: 1,
            tags: 1,
            author: 1,
            modified: 1,
            created: 1,
            readTime: 1
          })
          .sort({
            modified: -1
          })
          .skip(skip)
          .limit(limit)
          .populate('author')
          .exec()
        ctx.body = {
          range: createRange(skip, result, count),
          values: result.map(({ _doc }) => summarize_post(_doc))
        }
      } catch (err) {
        handleError(ctx, err)
      }
    }
  })
}

export default init
