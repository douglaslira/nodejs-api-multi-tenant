const Router = require('koa-router')

import profile from './profile'
import administrators from './administrators'
import domains from './domains'
import uploads from './uploads'
import users from './users'
import onboarding_tags from './onboarding_tags'

const init = (app, adminService, endUserServices) => {
  const router = new Router({
    prefix: '/aa' // aa === admin api
  })

  profile(router, adminService)
  administrators(router, adminService)
  domains(router, adminService)
  uploads(router, adminService)
  users(router, adminService, endUserServices)
  onboarding_tags(router, adminService, endUserServices)

  app.use(router.routes())
  app.use(router.allowedMethods())
}

export default init
