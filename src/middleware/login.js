'use strict'

import { decoder, now } from './jwt/jwt'
import config from '../../config'

import { END_USER_API_ENDPOINT } from './endUser/api/index'

const decode = decoder({
  secret: config.endUserJwtSecret
})
const LOGIN_ENDPOINT = '/login'

export const ADMIN_LOGIN_ENDPOINT = `/aa${LOGIN_ENDPOINT}` // todo: import admin endpoint
export const END_USER_LOGIN_ENDPOINT = `${END_USER_API_ENDPOINT}${LOGIN_ENDPOINT}`

export const isLoginRequest = ({ url, method }) =>
  (url === ADMIN_LOGIN_ENDPOINT || url.startsWith(END_USER_LOGIN_ENDPOINT)) &&
  method === 'POST'

export const isLoggedIn = ({ state: { user } }) => !!user

export const loginWithCredentials = async (
  passport,
  serialize_profile,
  ctx,
  next
) => {
  try {
    const result = await passport.authenticate('local')(ctx, next)
    if (ctx.state.user) {
      const user = ctx.state.user
      ctx.body = serialize_profile(user)
    } else {
      ctx.throw(401, 'invalid_credentials')
    }
  } catch (err) {
    ctx.throw(401, err.message)
  }
}

export const loginWithJwt = async (passport, serialize_profile, ctx, next) => {
  const {
    state: { service: { User, domainName } },
    request: { body: { token } }
  } = ctx
  try {
    const { userId, email, exp } = decode(token)
    const user = await User.findByEmail(email)
    if (user) {
      const serialized = serialize_profile(user)
      ctx.login({ ...serialized, domain: domainName })
      ctx.status = 200
      ctx.body = serialized
    } else {
      ctx.throw(404, 'no_such_user')
    }
  } catch (err) {
    ctx.throw(401, err.message)
  }
}

export const loginWithFacebook = async (
  passport,
  serialize_profile,
  ctx,
  next
) => {
  try {
    const result = await passport.authenticate(
      'multi-domain-facebook-token-strategy'
    )(ctx, next)
    if (ctx.state.user) {
      // user existed, either because registered directly via facebook,
      // or because the email address in the FB info matched that of a previously
      // registered account, thus "connecting" the credentialled account with FB.
      const user = ctx.state.user
      ctx.body = serialize_profile(user)
    } else {
      // not yet registered
      ctx.throw(401, 'no_such_user')
    }
  } catch (err) {
    ctx.throw(401, err.message)
  }
}

export const login = (passport, serialize_profile) => {
  return async (ctx, next) => {
    if (isLoginRequest(ctx)) {
      if (isLoggedIn(ctx)) {
        ctx.logout()
      }
      if (ctx.request.path.endsWith('facebook')) {
        await loginWithFacebook(passport, serialize_profile, ctx, next)
      } else if (ctx.request.path.endsWith('jwt')) {
        await loginWithJwt(passport, serialize_profile, ctx, next)
      } else {
        await loginWithCredentials(passport, serialize_profile, ctx, next)
      }
    } else {
      await next()
    }
  }
}

const init = (app, passport, serialize_profile) => {
  app.use(login(passport, serialize_profile))
}

export default init
