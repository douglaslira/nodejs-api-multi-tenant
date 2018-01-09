import serialize_profile from '../serialize_profile'
import { encoder, decoder } from '../../jwt/jwt'
import crypto from 'crypto'
import config from '../../../../config'
import { generateAvatar } from '../../../utils/avatars'
import runAsync from '../../../utils/runAsync'

export const EMAIL_REGISTRATION_ENDPOINT = '/users/_new/email'

const PIN_AND_LINK_EXPIRY_SECONDS = 24 * 60 * 60

const encode = encoder({
  secret: config.endUserJwtSecret,
  expireInSeconds: PIN_AND_LINK_EXPIRY_SECONDS
})

const decode = decoder({
  secret: config.endUserJwtSecret
})

const init = router => {
  router.post(
    EMAIL_REGISTRATION_ENDPOINT,
    register(encode, createPin, generateAvatar)
  )

  router.get('/users/confirm-registration/:token', async (ctx, next) => {
    const {
      state: { domain, service: { User, activityStreams } },
      params: { token }
    } = ctx
    await confirmWithToken(ctx, User, token, domain, activityStreams)
  })

  router.get('/users/confirm-registration/:userId/:pin', async (ctx, next) => {
    const {
      state: { domain, service: { User, activityStreams } },
      params: { userId, pin }
    } = ctx
    await confirmWithPin(
      ctx,
      User,
      createPin,
      userId,
      pin,
      domain,
      activityStreams
    )
  })
}

export const register = (jwt, pin, generateAvatar) => {
  return async (ctx, next) => {
    const {
      state: { service: { mailer, domainName, User, filestore } },
      request: { body }
    } = ctx
    const avatar = generateAvatar
      ? await generateAvatar(body.email, filestore)
      : undefined
    const result = await User.register({
      ...body,
      avatar,
      initial_tags: body.tags || []
    })
    const user = serialize_profile(result)
    ctx.body = user
    ctx.status = 201 // created
    const token = jwt({
      userId: user._id,
      email: user.email
    })
    const verificationPin = pin(user)
    await mailer.enqueue({
      to: user.email,
      from: `${domainName} <no-reply@${domainName
        .split('.')
        .slice(-2)
        .join('.')}>`,
      type: 'confirm-registration',
      language: 'en', // todo: use request language
      payload: {
        user,
        domainName,
        confirmationUrl: `https://${domainName}/confirm-email-with-token/${token}`,
        pin: `${verificationPin}`
      }
    })
  }
}

export const confirmWithToken = async (
  ctx,
  User,
  token,
  domain,
  activityStreams
) => {
  const decoded = decode(token)
  const user = await User.findOne({ _id: decoded.userId, email: decoded.email })
  if (user) {
    if (user.verified) {
      const serialized = serialize_profile(user)
      ctx.login({ ...serialized, domain })
      ctx.status = 200 // OK ('cuz 304 not modified prevents json payload being returned)
      ctx.body = serialized
    } else {
      const serialized = serialize_profile(
        await User.completeRegistration(user)
      )
      ctx.login({ ...serialized, domain })
      ctx.status = 202 // accepted
      ctx.body = serialized
      runAsync(async () => {
        try {
          await activityStreams.followTags(user.initial_tags, user._id)
        } catch (e) {
          console.error(e)
        }
      })
    }
    return user
  } else {
    ctx.throw(400, 'no_such_user')
  }
}

export const confirmWithPin = async (
  ctx,
  User,
  pinFn,
  userId,
  pin,
  domain,
  activityStreams
) => {
  const user = await User.findById(userId)
  if (user) {
    const validPin = pinFn(user)
    if (pin === validPin) {
      if (user.verified) {
        ctx.body = serialize_profile(user)
        ctx.status = 200 // OK ('cuz 304 not modified prevents json payload being returned)
      } else {
        const verified = await User.completeRegistration(user)
        ctx.body = serialize_profile(verified)
        ctx.status = 202 // accepted
        runAsync(async () => {
          try {
            await activityStreams.followTags(
              verified.initial_tags,
              verified._id
            )
          } catch (e) {
            console.error(e)
          }
        })
      }
      ctx.login({ ...serialize_profile(user), domain })
      return user
    } else {
      ctx.throw(400, 'invalid_pin')
    }
  } else {
    ctx.throw(400, 'no_such_user')
  }
}

export const createPin = user => {
  const encode = encoder({
    secret: config.endUserJwtSecret,
    expireInSeconds: PIN_AND_LINK_EXPIRY_SECONDS,
    time: () => {
      return user.registered
    }
  })
  const jwt = encode(`${user._id}${user.email}`)
  decode(jwt) // throws if expired
  return jwt.substring(jwt.length - 5, jwt.length)
}

export default init
