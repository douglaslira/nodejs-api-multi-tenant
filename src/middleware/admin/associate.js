'use strict'

export const associateServiceWithContext = service => {
  return async (ctx, next) => {
    ctx.state.service = service
    await next()
  }
}

const init = (app, service) => {
  // make ctx.state.service = the admin services ...
  app.use(associateServiceWithContext(service))
}

export default init
