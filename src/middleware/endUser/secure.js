'use strict'

import { END_USER_LOGIN_ENDPOINT } from '../login'
import { END_USER_API_ENDPOINT } from './api'
import { EMAIL_REGISTRATION_ENDPOINT } from './api/register_with_email'
import { FACEBOOK_REGISTRATION_ENDPOINT } from './api/register_with_facebook'

const END_USER_EMAIL_REGISTRATION_ENDPOINT = `${END_USER_API_ENDPOINT}${EMAIL_REGISTRATION_ENDPOINT}`
const END_USER_FACEBOOK_REGISTRATION_ENDPOINT = `${END_USER_API_ENDPOINT}${FACEBOOK_REGISTRATION_ENDPOINT}`

export const isLoggedIn = ({ state: { user } }) => !!user

// note: this is a basic first pass ... there are more complex cases that will
// need to be addressed such as access to specific Groups, but those are probably
// better addressed by the Group specific middleware handlers ...
export const isProtectedEndUserRequest = ({ url, method }) =>
  !(
    url === END_USER_LOGIN_ENDPOINT ||
    url.startsWith(END_USER_EMAIL_REGISTRATION_ENDPOINT) ||
    url.startsWith(END_USER_FACEBOOK_REGISTRATION_ENDPOINT) ||
    method === 'GET'
  )

export const secureAPIs = async (ctx, next) => {
  if (isProtectedEndUserRequest(ctx)) {
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
