'use strict'

import config from '../../../config'
import { decoder } from './jwt'

export const getCredentials = ctx => {
  if (!ctx.header || !ctx.header.authorization) {
    return
  }
  const parts = ctx.header.authorization.split(' ')
  if (parts.length === 2) {
    const scheme = parts[0]
    const credentials = parts[1]
    if (/^Bearer$/i.test(scheme)) {
      return credentials
    }
  }
}

export const decodeMiddleware = opts => {
  const decode = decoder(opts)
  return async (ctx, next) => {
    const credentials = getCredentials(ctx)
    if (credentials) {
      ctx.state.jwt = decode(credentials)
    }
    await next()
  }
}

const init = (app, secret) => {
  app.use(decodeMiddleware({ secret }))
}

export default init
