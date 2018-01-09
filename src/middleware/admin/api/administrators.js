import serialize_profile from '../serialize_profile'
import mongoose from 'mongoose'
import { createRange } from '../../../utils/ranges'

const ValidationError = mongoose.Error.ValidationError

const init = (router, service) => {
  const { Administrator } = service

  const createFilterQuery = function(filter) {
    const regex = new RegExp(`.*${filter}.*`, 'i')
    return {
      $or: [{ email: regex }, { firstname: regex }, { lastname: regex }]
    }
  }

  const handleError = function(ctx, err) {
    if (err instanceof ValidationError) {
      ctx.status = 400
      ctx.body = err
    } else {
      ctx.throw(500, err.message, err)
    }
  }

  /**
  curl 'http://localhost:3001/aa/administrators/_new/1-2' -H 'Accept-Encoding: gzip, deflate, br' -H 'Accept-Language: en-US,en;q=0.8,ar;q=0.6' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36' -H 'content-type: application/json' -H 'accept: application/json' -H 'Referer: http://localhost:3001/administrators' -H 'Cookie: sid=eyJwYXNzcG9ydCI6eyJ1c2VyIjp7InVpZCI6IjU5NmQyMWIwNTI3YWYzNDI0M2ZiMzI0NCJ9fSwiX2V4cGlyZSI6MTUwMTA4MTA1MTY2NywiX21heEFnZSI6MTIwMDAwMH0=; sid.sig=jZE3m9GPoJqPQvDfcvRRnXpho8Q' -H 'Connection: keep-alive' --compressed
  */
  router.post('/administrators/_new', async (ctx, next) => {
    try {
      const result = await Administrator.register(ctx.request.body)
      ctx.body = serialize_profile(result)
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.get('/administrators/:id', async (ctx, next) => {
    try {
      const result = await Administrator.findById(ctx.params.id)
      ctx.body = serialize_profile(result)
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.post('/administrators/:id', async (ctx, next) => {
    try {
      const result = await Administrator.updateRegistration(ctx.request.body)
      ctx.body = serialize_profile(result)
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.delete('/administrators/:id', async (ctx, next) => {
    try {
      const result = await Administrator.findOneAndRemove({
        _id: ctx.params.id
      }).exec()
      ctx.body = serialize_profile(result)
    } catch (err) {
      handleError(ctx, err)
    }
  })

  // filtering and paging are probably massive overkill - don't expect many ADMIN users!
  router.get('/administrators/:filter/:start-:end', async (ctx, next) => {
    const skip = parseInt(ctx.params.start) - 1
    const limit = parseInt(ctx.params.end) - skip
    const query =
      ctx.params.filter !== '_ALL' ? createFilterQuery(ctx.params.filter) : {}
    try {
      const count = await Administrator.count(query).exec()
      const result = await Administrator.find(query)
        .select({
          _id: 1,
          email: 1,
          firstname: 1,
          lastname: 1,
          registered: 1
        })
        .sort({
          registered: -1
        })
        .skip(skip)
        .limit(limit)
        .exec()
      ctx.body = {
        range: createRange(skip, result, count),
        values: result.map(serialize_profile)
      }
    } catch (err) {
      handleError(ctx, err)
    }
  })
}

export default init
