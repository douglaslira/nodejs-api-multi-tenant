'use strict'

import log from './log'
import serialize_profile from './middleware/admin/serialize_profile'

import errorMiddleware from './middleware/error'
import loggingMiddleware from './middleware/logging'
import localeMiddleware from './middleware/locale'

import adminAssociationMiddleware from './middleware/admin/associate'
import adminSecurityMiddleware from './middleware/admin/secure'
import passportMiddleware from './middleware/admin/passport'
import passwordLoginMiddleware from './middleware/login'
import logoutMiddleware from './middleware/logout'
import adminAPIs from './middleware/admin/api'

const config = require('../config')
const koaBody = require('koa-body')

export const init = (app, adminService, endUserServices) => {
  try {
    errorMiddleware(app)
    loggingMiddleware(app)
    localeMiddleware(app)

    // body parsing enables json payloads and file uploads
    app.use(koaBody({ multipart: true }))

    // associate the admin services with the request context
    adminAssociationMiddleware(app, adminService)

    // initialise a new instance of passport (can't use the default)
    // instance as we have two separate servers that need separate
    // passport configurations ...
    const passport = passportMiddleware(app, adminService, {
      secret: config.adminJwtSecret,
      expiryInSeconds: config.adminSessionExpiry,
      domain: config.adminDomainName
    })

    // provides "local" login with credentials via passport. Note
    // that we're passing in our passport instance ...
    passwordLoginMiddleware(app, passport, serialize_profile)
    logoutMiddleware(app)

    // protection for admin API's
    adminSecurityMiddleware(app)

    adminAPIs(app, adminService, endUserServices)
  } catch (err) {
    log.error(err)
  }
}
