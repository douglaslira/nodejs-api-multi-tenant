'use strict'

import { ADMIN_LOGIN_ENDPOINT } from '../login'

export const isLoggedIn = ({ state: { user } }) => !!user

export const isProtectedAdminRequest = ({ url, method }) =>
  url !== ADMIN_LOGIN_ENDPOINT

export const secureAPIs = async (ctx, next) => {
  if (isProtectedAdminRequest(ctx)) {
    if (isLoggedIn(ctx)) {
      await next()
    } else {
      ctx.throw(401, 'authentication_required')
    }
  } else {
    await next()
  }
}

const init = app => {
  app.use(secureAPIs)
}

export default init
