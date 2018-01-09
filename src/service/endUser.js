'use strict'

import newMailer from '../mailer'

const domains = {}

const service = domainDBs => {
  const result = {
    get: domain => {
      let result = domains[domain]
      if (!result) {
        const db = domainDBs.get(domain)
        if (db) {
          const mailer = newMailer(db.pubsub)
          mailer.handleQueue() // todo: move this to a completely separate process
          if (db) {
            result = {
              domainName: domain,
              getInfo: db.getInfo,
              OnboardingTags: db.OnboardingTags,
              User: db.User,
              Post: db.Post,
              Draft: db.Draft,
              filestore: db.filestore,
              pubsub: db.pubsub,
              UserFollowers: db.UserFollowers,
              GroupFollowers: db.GroupFollowers,
              TagFollowers: db.TagFollowers,
              mailer: mailer,
              activityStreams: db.activityStreams
            }
            domains[domain] = result
          }
        } else {
          throw new Error('no_such_domain', domain)
        }
      }
      return result
    }
  }
  // pre-emptive initialisation
  domainDBs.forEach(db => result.get(db.domainName))
  return result
}

export default service
