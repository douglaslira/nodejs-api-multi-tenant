'use strict'

import mongoose from 'mongoose'
const ValidationError = mongoose.Error.ValidationError
import serialize_profile from '../serialize_profile'

const init = (router, services) => {
  const isViewable = (post, user) => {
    return true // TODO: once we have groups we need to do a real check here
  }

  const handleError = function(ctx, err) {
    if (err instanceof ValidationError) {
      ctx.status = 400
      ctx.body = err
    } else {
      ctx.throw(500, err.message, err)
    }
  }

  const summarize_response = response => {
    return {
      _id: response._id,
      thread: response.thread,
      responseCount: response.responseCount,
      name: response.name,
      type: response.type,
      language: response.language,
      title: response.title,
      image: response.image,
      author: serialize_profile(response.author),
      modified: response.modified,
      created: response.created,
      tags: response.tags,
      readTime: response.readTime
    }
  }

  const loadResponses = async (ctx, next) => {
    const { state: { user } } = ctx
    const {
      state: { domain, service: { Post, User, Response } },
      params: { id, depth, start, end }
    } = ctx
    try {
      let post = await Post.findById(id)
      if (isViewable(post, user)) {
        const skip = parseInt(ctx.params.start) - 1
        const limit = parseInt(ctx.params.end) - skip
        // viewability of responses is determined by viewability of
        // the post that the response is a response to, because those
        // cannot be different - simplifies our queries :)
        ctx.body = await Post.findConversations(
          post._id,
          { depth, skip, limit },
          User
        )
      } else {
        ctx.throw(403, 'permission_denied')
      }
    } catch (err) {
      handleError(ctx, err)
    }
  }

  router.get('/posts/:id/responses/:start-:end', loadResponses)
}

export default init
