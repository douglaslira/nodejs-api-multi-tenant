'use strict'
import serialize_profile from '../../endUser/serialize_profile'
import { encoder } from '../../jwt/jwt'
import config from '../../../../config'
import { emailOriginCreator } from '../../../utils/utils'
import { createRange } from '../../../utils/ranges'

const encode = encoder({
  secret: config.endUserJwtSecret,
  expireInSeconds: 259200 // 72hours
})

const init = (router, adminServices, endUserServices) => {
  const createFilterQuery = function(filter) {
    const regex = new RegExp(`.*${filter}.*`, 'i')
    return {
      $or: [{ email: regex }, { username: regex }]
    }
  }

  router.get('/domains/:id/users/:filter/:start-:end', async (ctx, next) => {
    const domainDescriptor = await adminServices.Domain.findById(ctx.params.id)
    const domainService = endUserServices.get(domainDescriptor.domainName)
    if (!domainDescriptor) ctx.throw(404, 'no_such_domain')

    const skip = parseInt(ctx.params.start) - 1
    const limit = parseInt(ctx.params.end) - skip
    const query =
      ctx.params.filter !== '_ALL' ? createFilterQuery(ctx.params.filter) : {}
    try {
      const count = await domainService.User.count(query).exec()
      const result = await domainService.User
        .find(query)
        .select({
          _id: 1,
          email: 1,
          username: 1,
          firstname: 1,
          lastname: 1,
          role: 1,
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
      ctx.throw(400, err)
    }
  })

  router.get('/domains/:id/users/:userid', async (ctx, next) => {
    const domainDescriptor = await adminServices.Domain.findById(ctx.params.id)
    if (!domainDescriptor) ctx.throw(404, 'no_such_domain')
    const domainService = endUserServices.get(domainDescriptor.domainName)
    try {
      const result = await domainService.User.findById(ctx.params.userid)
      ctx.body = serialize_profile(result)
    } catch (err) {
      ctx.throw(400, err)
    }
  })

  router.post('/domains/:id/users/_new', async (ctx, next) => {
    const domainDescriptor = await adminServices.Domain.findById(ctx.params.id)
    if (!domainDescriptor) ctx.throw(404, 'no_such_domain')
    const domainService = endUserServices.get(domainDescriptor.domainName)
    try {
      const result = await domainService.User.create(ctx.request.body)
      const token = encode({
        userId: result._id,
        email: result.email
      })
      const user = result.user
      const domainName = domainDescriptor.domainName

      await domainService.mailer.enqueue({
        to: result.email,
        from: emailOriginCreator(domainName),
        type: 'reset-password',
        language: 'en',
        payload: {
          user,
          domainName,
          confirmationUrl: `https://${domainName}/reset-password/${token}`
        }
      })

      ctx.status = 201
      ctx.body = serialize_profile(result)
    } catch (err) {
      ctx.throw(400, err)
    }
  })

  router.post('/domains/:id/users/:userid', async (ctx, next) => {
    const domainDescriptor = await adminServices.Domain.findById(ctx.params.id)
    if (!domainDescriptor) ctx.throw(404, 'no_such_domain')
    const domainService = endUserServices.get(domainDescriptor.domainName)
    const {
      params: { userid },
      request: { body: { role, email, username, firstname, lastname } }
    } = ctx
    try {
      const update = {
        $set: {
          role,
          email,
          username,
          firstname,
          lastname
        }
      }
      const result = await domainService.User
        .findOneAndUpdate(
          {
            _id: userid
          },
          update,
          { new: true }
        )
        .exec()
      ctx.body = result
    } catch (err) {
      ctx.throw(400, err)
    }
  })
}

export default init
