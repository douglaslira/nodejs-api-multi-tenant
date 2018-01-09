'use strict'

import serialize_profile from './serialize_profile'
import MultiDomainFacebookStrategy from './MultiDomainFacebookStrategy'

const init = (app, services, opts) => {
  const session = require('koa-session')
  const LocalStrategy = require('passport-local')

  app.keys = [opts.secret]
  app.use(
    session(
      {
        key: 'sid',
        maxAge: opts.expiryInSeconds * 1000,
        rolling: true,
        sameSite: true
        // todo: need to set the domain dynamically to whatever domain the request was made to!
      },
      app
    )
  )

  const Passport = require('koa-passport').KoaPassport
  const passport = new Passport()

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
      },
      async (req, email, password, done) => {
        // req.service is bound to the correct domain (or admin services)
        // by the `associate` middleware, specifically for this purpose
        const { User } = req.service
        try {
          const user = await User.login(email, password)
          if (user) {
            return done(null, {
              ...serialize_profile(user),
              domain: req.hostname
            })
          } else {
            return done(null, false, { message: 'invalid_credentials' })
          }
        } catch (err) {
          done(err)
        }
      }
    )
  )

  passport.use(new MultiDomainFacebookStrategy())

  passport.serializeUser((user, done) => {
    done(null, { uid: user._id, domain: user.domain })
  })

  passport.deserializeUser(async (cookie, done) => {
    try {
      const service = services.get(cookie.domain)
      const user = await service.User.findById(cookie.uid).exec()

      done(null, user)
    } catch (err) {
      console.error(err)
      done() // don't propagate the error
    }
  })

  app.use(passport.initialize())
  app.use(passport.session())

  // can't set `secure` directly when creating the cookie due to silliness in koa
  // see https://github.com/koajs/koa/issues/974
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '******* COOKIES ARE NOW SECURE - SESSIONS WILL NOT WORK WITHOUT HTTPS *******'
    )
    app.use(async (ctx, next) => {
      ctx.cookies.secure = true
      await next()
    })
  }

  return passport
}

export default init
