'use strict'

import serialize_profile from './middleware/endUser/serialize_profile'
import log from './log'

import errorMiddleware from './middleware/error'
import loggingMiddleware from './middleware/logging'
import localeMiddleware from './middleware/locale'

import domainAssociationMiddleware from './middleware/endUser/associate'
import domainSecurityMiddleware from './middleware/endUser/secure'
import passportMiddleware from './middleware/endUser/passport'
import passwordLoginMiddleware from './middleware/login'
import logoutMiddleware from './middleware/logout'
import endUserAPIs from './middleware/endUser/api'

const config = require('../config')
const koaBody = require('koa-body')

export const init = (app, services) => {
  try {
    errorMiddleware(app)
    loggingMiddleware(app)
    localeMiddleware(app)

    // body parsing enables json payloads and file uploads
    app.use(koaBody({ multipart: true }))

    // bind the end-user services for a specific domain to
    // the context so that following middlewares have access
    domainAssociationMiddleware(app, services)

    // initialise a new instance of passport (can't use the default)
    // instance as we have two separate servers that need separate
    // passport configurations ...
    const passport = passportMiddleware(app, services, {
      secret: config.endUserJwtSecret,
      expiryInSeconds: config.endUserSessionExpiry
    })

    // provides "local" login with credentials via passport. Note
    // that we're passing in our passport instance ...
    passwordLoginMiddleware(app, passport, serialize_profile)
    logoutMiddleware(app)

    // basic protection for domain API's
    domainSecurityMiddleware(app)

    endUserAPIs(app)
  } catch (err) {
    log.error(err)
  }
}
