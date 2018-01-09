'use strict'

const passport = require('koa-passport')

import config from '../../config'

export const ADMIN_LOGOUT_ENDPOINT = '/aa/logout'
export const END_USER_LOGOUT_ENDPOINT = '/ua/logout'

export const isLogoutRequest = ({ url, method }) =>
  (url === ADMIN_LOGOUT_ENDPOINT || url === END_USER_LOGOUT_ENDPOINT) &&
  method === 'POST'

export const isLoggedIn = ({ state: { user } }) => !!user

export const logout = async (ctx, next) => {
  if (isLogoutRequest(ctx)) {
    ctx.logout()
    ctx.status = 200
    ctx.body = { success: true }
  } else {
    await next()
  }
}

const init = app => {
  app.use(logout)
}

export default init
