'use strict'

import serialize_profile from '../serialize_profile'
import { decoder, now } from '../../jwt/jwt'
import { hash, isValidPassword } from '../../../utils/passwords'
import { createRange } from '../../../utils/ranges'
import { PASSWORD_SALT } from '../../../model/domain/UserFactory'
import config from '../../../../config'

const decode = decoder({
  secret: config.endUserJwtSecret
})

const init = router => {
  router.post('/users/reset-password', async (ctx, next) => {
    const {
      request: { body: { password } },
      state: { service: { User }, user }
    } = ctx

    if (!isValidPassword(password)) {
      ctx.throw(400, 'Bad Request')
    }

    try {
      const update = {
        $set: {
          password: hash(password, PASSWORD_SALT)
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

  router.get('/users/by-username/:username', async (ctx, next) => {
    const { state: { service: { User } }, params: { username } } = ctx
    const result = await User.findByUsername(username)
    if (result) {
      ctx.body = serialize_profile(result)
    } else {
      ctx.throw(404, 'no_such_user')
    }
  })

  router.get('/users/by-email/:email', async (ctx, next) => {
    const { state: { service: { User } }, params: { email } } = ctx
    const result = await User.findByEmail(email)
    if (result) {
      ctx.body = serialize_profile(result)
    } else {
      ctx.throw(404, 'no_such_user')
    }
  })

  router.get('/users/suggest/:filter', async (ctx, next) => {
    const { state: { service: { User } }, params: { filter } } = ctx
    const result = await User.suggest(filter)
    if (result) {
      ctx.body = {
        range: createRange(0, result, result.length),
        values: result.map(serialize_profile)
      }
    } else {
      ctx.throw(404, 'no_such_user')
    }
  })
}

// todo: this could be extracted further for re-use across different entity types ...
export const list = async (User, filter, skip, limit) => {
  const query = filter !== '_ALL' ? filter : {}
  const count = await User.count(query).exec()
  const result = await User.find(query)
    .select({
      _id: 1,
      username: 1,
      email: 1,
      registeredAt: 1
    })
    .sort({
      registeredAt: -1
    })
    .skip(skip)
    .limit(limit)
    .exec()
  return {
    range: {
      start: result.length ? skip + 1 : 0,
      end: result.length ? skip + result.length : 0,
      total: count
    },
    values: result
  }
}

export default init
