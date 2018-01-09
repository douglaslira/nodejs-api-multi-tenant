'use strict'

import log from '../log'
import mongoose from 'mongoose'

const ValidationError = mongoose.Error.ValidationError

const init = app => {
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      if (err instanceof ValidationError) {
        ctx.status = 400
        ctx.body = err
      } else {
        log.error('error', err)
        ctx.throw(500, err.message ? err.message : err, err)
        ctx.app.emit('error', err, ctx)
      }
    }
  })
}

export default init
