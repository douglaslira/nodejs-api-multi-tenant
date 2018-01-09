const Router = require('koa-router')

import info from './domain-info'
import profile from './profile'
import users from './users'
import register_with_email from './register_with_email'
import register_with_facebook from './register_with_facebook'
import uploads from './uploads'
import drafts from './drafts'
import posts from './posts'
import activity from './activity'
import responses from './responses'

export const END_USER_API_ENDPOINT = '/ua'

const init = (app, services) => {
  const router = new Router({
    prefix: END_USER_API_ENDPOINT // ua === user api
  })

  info(router, services)

  profile(router, services)
  users(router, services)
  register_with_email(router, services)
  register_with_facebook(router, services)
  uploads(router, services)
  drafts(router, services)
  posts(router, services)
  activity(router, services)
  responses(router, services)

  app.use(router.routes())
  app.use(router.allowedMethods())
}

export default init
