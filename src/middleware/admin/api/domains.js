import serialize_domain from '../serialize_profile'
import { createRange } from '../../../utils/ranges'

const init = (router, service) => {
  const { Domain } = service

  const createFilterQuery = function(filter) {
    const regex = new RegExp(`.*${filter}.*`, 'i')
    return { domainName: regex }
  }

  router.post('/domains/_new', async (ctx, next) => {
    try {
      const {
        domainName,
        smallLogo,
        largeLogo,
        facebookAppId,
        facebookAppSecret,
        getStreamKey,
        getStreamSecret
      } = ctx.request.body
      const result = await service.newDomain(
        {
          domainName,
          smallLogo,
          largeLogo,
          facebookAppId,
          facebookAppSecret,
          getStreamKey,
          getStreamSecret
        },
        ctx.state.user
      )
      ctx.response.body = result
    } catch (err) {
      console.error(err)
      ctx.throw(500, err.message || err)
    }
  })

  router.get('/domains/:id', async (ctx, next) => {
    try {
      const result = await Domain.findById(ctx.params.id)
      ctx.body = result
    } catch (err) {
      console.error(err)
      ctx.throw(500, err.message || err)
    }
  })

  router.post('/domains/:id', async (ctx, next) => {
    // todo: validate logo's ...
    // todo: allow for updating one logo without updating the other (in $set below)
    const {
      params: { id },
      request: {
        body: {
          smallLogo,
          largeLogo,
          facebookAppId,
          facebookAppSecret,
          getStreamKey,
          getStreamSecret
        }
      }
    } = ctx
    try {
      const update = {
        $set: {
          smallLogo,
          largeLogo,
          facebookAppId,
          facebookAppSecret,
          getStreamKey,
          getStreamSecret
        }
      }
      const result = await Domain.findOneAndUpdate(
        {
          _id: id
        },
        update,
        { new: true }
      ).exec()
      ctx.body = result
    } catch (err) {
      console.error(err)
      ctx.throw(500, err.message || err)
    }
  })

  // filtering and paging are probably massive overkill - don't expect many ADMIN users!
  router.get('/domains/:filter/:start-:end', async (ctx, next) => {
    const skip = parseInt(ctx.params.start) - 1
    const limit = parseInt(ctx.params.end) - skip
    const query =
      ctx.params.filter !== '_ALL' ? createFilterQuery(ctx.params.filter) : {}
    try {
      const count = await Domain.count(query).exec()
      const result = await Domain.find(query)
        .select({
          _id: 1,
          domainName: 1,
          smallLogo: 1,
          largeLogo: 1,
          createdAt: 1,
          createdBy: 1,
          facebookAppId: 1,
          facebookAppSecret: 1,
          getStreamKey: 1,
          getStreamSecret: 1
        })
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit)
        .exec()
      ctx.body = {
        range: createRange(skip, result, count),
        values: result
      }
    } catch (err) {
      console.error(err)
      ctx.throw(500, err.message || err)
    }
  })
}

export default init
