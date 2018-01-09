'use strict'

const init = (router, services) => {
  const loadActivities = async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) {
      ctx.throw(401, 'authentication_required')
    } else {
      const { state: { service }, params: { type, before, limit } } = ctx
      const lim = limit && parseInt(limit)
      const activityStreams = service.activityStreams
      const result = await activityStreams.loadTimeline(
        type,
        user._id,
        lim,
        before
      )
      ctx.body = result
    }
  }

  const loadTagTimelines = async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) {
      ctx.throw(401, 'authentication_required')
    } else {
      const { state: { service }, params: { before, limit } } = ctx
      const lim = limit && parseInt(limit)
      const activityStreams = service.activityStreams
      const result = await activityStreams.loadTagTimelines(
        user._id,
        lim,
        before
      )
      ctx.body = result
    }
  }

  const loadTagTimeline = async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) {
      ctx.throw(401, 'authentication_required')
    } else {
      const { state: { service }, params: { tag, before, limit } } = ctx
      const lim = limit && parseInt(limit)
      const activityStreams = service.activityStreams
      const result = await activityStreams.loadTagTimeline(
        tag,
        user._id,
        lim,
        before
      )
      ctx.body = result
    }
  }

  router.get('/activities/:type/', loadActivities)
  router.get('/activities/:type/:limit', loadActivities)
  router.get('/activities/:type/:limit/:before', loadActivities)

  router.get('/tag-activity/_ALL/:limit', loadTagTimelines)
  router.get('/tag-activity/_ALL/:limit/:before', loadTagTimelines)

  router.get('/tag-activity/:tag/:limit', loadTagTimeline)
  router.get('/tag-activity/:tag/:limit/:before', loadTagTimeline)
}

export default init
