import serialize_profile from '../serialize_profile'

const init = (router, service) => {
  router.get('/profile', async (ctx, next) => {
    const user = ctx.state.user
    if (user) {
      ctx.body = serialize_profile(user)
    } else {
      ctx.throw(401, 'authentication_required')
    }
  })

  router.get('/:entityType/:entityId/followers/', async (ctx, next) => {
    new Error('todo')
  })

  router.get(
    '/:entityType/:entityId/followers/:followerId',
    async (ctx, next) => {
      const {
        params: { entityType, entityId, followerId },
        state: { service }
      } = ctx
      const EntityFollowers =
        entityType === 'user' ? service.UserFollowers : service.TagFollowers
      const result = await EntityFollowers.findOne({
        followed: entityId,
        follower: followerId
      })
      if (result) {
        ctx.status = 200
        ctx.body = serialize_profile(result)
      } else {
        ctx.throw(404, 'no_such_follower')
      }
    }
  )

  router.post('/:entityType/_ALL/followers/:followerId', async (ctx, next) => {
    const {
      params: { entityType, followerId },
      request: { body: { entities } },
      state: { service }
    } = ctx
    const EntityFollowers =
      entityType === 'user' ? service.UserFollowers : service.TagFollowers
    const result = await EntityFollowers.find({
      followed: { $in: entities },
      follower: followerId
    })
    if (result) {
      const following = result.map(f => ({
        _id: f.followed, // key by the tag name
        following: true,
        when: f.when
      }))
      ctx.status = 200
      ctx.body = {
        values: following,
        range: {}
      }
    } else {
      ctx.throw(404, 'no_such_follower')
    }
  })

  router.post(
    '/:entityType/:entityId/followers/:followerId',
    async (ctx, next) => {
      const result = await followOrUnfollow(ctx, true)
      ctx.body = { following: result.success }
    }
  )

  router.delete(
    '/:entityType/:entityId/followers/:followerId',
    async (ctx, next) => {
      const result = await followOrUnfollow(ctx, false)
      if (result.success) {
        ctx.status = 204
      } else {
        ctx.throw(404, 'no_such_follower')
      }
    }
  )

  function followOrUnfollow(ctx, follow) {
    const {
      params: { entityType, entityId, followerId },
      state: { service, user }
    } = ctx
    if (user.role == 'ADMIN' || user._id == followerId) {
      const streams = service.activityStreams
      switch (entityType) {
        case 'user':
          if (follow) {
            return streams.followUser(entityId, followerId)
          } else {
            return streams.unfollowUser(entityId, followerId)
          }
        case 'tag':
          if (follow) {
            return streams.followTag(entityId, followerId)
          } else {
            return streams.unfollowTag(entityId, followerId)
          }
        default:
          throw new Error(`unhandled entity type '${entityType}'`)
      }
    } else {
      ctx.throw(403, 'naughty')
    }
  }

  router.post('/profile', async (ctx, next) => {
    const {
      request: {
        body: {
          profile: { username, firstname, lastname, gender, bio, avatar }
        }
      },
      state: { service: { User }, user }
    } = ctx
    try {
      const update = {
        $set: {
          username,
          firstname,
          lastname,
          gender,
          bio,
          avatar
        }
      }
      const result = await User.findOneAndUpdate(
        {
          _id: user._id
        },
        update,
        { new: true }
      ).exec()
      ctx.body = serialize_profile(result)
    } catch (err) {
      ctx.throw(500, err)
    }
  })

  router.post('/uploads', async (ctx, next) => {
    const {
      state: { domain, service: { filestore } },
      request: { body: { files } = {} } = {}
    } = ctx
    if (files) {
      const uploads = Object.values(files).map(f => filestore.copyFromFile(f))
      ctx.body = await Promise.all(uploads)
    } else {
      ctx.throw(400, 'No files were uploaded')
    }
  })
}

export default init

// curl -H "Content-Type: application/json" -X POST -d '{"email":"steveliles@gmail.com","password":"9e8d135c1a"}' http://localhost:3003/aa/login
// curl -H "Content-Type: application/json" --cookie "sid=eyJwYXNzcG9ydCI6eyJ1c2VyIjoiNTk2ZDIxYjA1MjdhZjM0MjQzZmIzMjQ0In0sIl9leHBpcmUiOjE1MDAzODY4NTUxMDMsIl9tYXhBZ2UiOjEyMDAwMDB9;sid.sig=fKIdvt6x5dcWf3LKrljsvzaa4u0" -X GET http://localhost:3003/aa/profile
