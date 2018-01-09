'use strict'

import serialize_profile from './serialize_profile'
import { assignWithoutOverwrite } from '../../utils/utils'

const util = require('util'),
  Strategy = require('passport-strategy'),
  FacebookTokenStrategy = require('passport-facebook-token')

export const createLocale = localeString => {
  const [language, region] = localeString.split('_')
  return {
    language,
    region,
    value: localeString
  }
}

export const createAvatarFilename = url => {
  const parts = url.split(/\.|\?/)
  if (parts && parts.length === 3) return `fb-avatar.${parts[1]}`
  else return 'fb-avatar.png'
}

export const createUserFromFacebookInfo = async (fb, filestore) => {
  const result = {
    firstname: fb.first_name,
    lastname: fb.last_name,
    email: fb.email,
    facebookUserId: fb.userID,
    gender: fb.gender,
    locale: createLocale(fb.locale),
    initial_tags: fb.tags || []
  }
  if (fb.picture && fb.picture.data && !fb.picture.data.is_silhouette) {
    // upload picture to S3, store and return embedded image schema in result
    const avatar = await filestore.copyFromURL(
      fb.picture.data.url,
      createAvatarFilename(fb.picture.data.url)
    )
    return { ...result, avatar }
  } else {
    return result
  }
}

function MultiDomainFacebookStrategy() {
  Strategy.call(this)
  this.name = 'multi-domain-facebook-token-strategy'
}

util.inherits(MultiDomainFacebookStrategy, Strategy)

MultiDomainFacebookStrategy.prototype.getStrategy = async function(service) {
  if (!service.passport_strategies) {
    service.passport_strategies = {}
  }
  if (!service.passport_strategies.facebook) {
    const info = await service.getInfo()
    const { User, filestore } = service
    const facebook = new FacebookTokenStrategy(
      {
        accessTokenField: 'accessToken',
        passReqToCallback: true,
        clientID: info.facebookAppId,
        clientSecret: info.facebookAppSecret
      },
      async function(req, accessToken, refreshToken, profile, done) {
        try {
          let user = await User.findOne({
            facebookUserId: profile.id
          })
          if (user) {
            // user previously registered or connected their facebook account,
            // we're good to go ...
            done(
              null,
              {
                ...serialize_profile(user),
                domain: req.hostname
              },
              profile
            )
          } else {
            const fbUser = await createUserFromFacebookInfo(req.body, filestore)
            if (profile._json && profile._json.email) {
              const existing = await User.findOne({
                email: profile._json.email
              })
              if (existing) {
                // user previously registered via email with the same address,
                // so we can connect facebook to that credentialled account and
                // continue with successful login
                user = await User.findOneAndUpdate(
                  {
                    _id: existing._id
                  },
                  assignWithoutOverwrite(serialize_profile(existing), {
                    ...fbUser,
                    verified: new Date()
                  })
                ).exec()
                done(
                  null,
                  {
                    ...serialize_profile(user),
                    domain: req.hostname
                  },
                  profile
                )
              } else {
                // user with matching email doesn't exist, can't login
                done()
              }
            } else {
              // user didn't allow us to see the email and hasn't registered
              // with facebook, so can't login
              done()
            }
          }
        } catch (err) {
          done(err)
        }
      }
    )
    service.passport_strategies.facebook = facebook
  }
  return service.passport_strategies.facebook
}

MultiDomainFacebookStrategy.prototype.authenticate = async function(
  req,
  options
) {
  const { service, body } = req
  const strategy = await this.getStrategy(service)
  strategy.success = (user, info) => {
    return this.success(user, info)
  }
  strategy.fail = (challenge, status) => {
    return this.fail(challenge, status)
  }
  strategy.redirect = (url, status) => {
    return this.redirect(url, status)
  }
  strategy.pass = () => {
    return this.pass()
  }
  strategy.error = err => {
    return this.error(err)
  }
  return await strategy.authenticate(req, options)
}

export default MultiDomainFacebookStrategy
