'use strict'

const init = (app, { Administrator }, opts) => {
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
        // todo: need to set the domain name to opts.domain ?
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
        try {
          const user = await Administrator.login(email, password)
          if (user) {
            return done(null, user)
          } else {
            return done(null, false, { message: 'invalid_credentials' })
          }
        } catch (err) {
          done(err)
        }
      }
    )
  )

  passport.serializeUser((user, done) => {
    done(null, { uid: user._id })
  })

  passport.deserializeUser(async (cookie, done) => {
    try {
      const user = await Administrator.findById(cookie.uid).exec()
      done(null, user)
    } catch (err) {
      done(err)
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
