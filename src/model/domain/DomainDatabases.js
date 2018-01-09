'use strict'

import Database from '../Database'
import UserFactory from './UserFactory'
import DraftFactory from './DraftFactory'
import PostFactory from './PostFactory'
import UserFollowersFactory from './UserFollowersFactory'
import TagFollowersFactory from './TagFollowersFactory'
import TagTimelineFactory from './TagTimelineFactory'
import AggregatedTagTimelineFactory from './AggregatedTagTimelineFactory'
import OnboardingTagsFactory from './OnboardingTagsFactory'
import ActivityFactory from './ActivityFactory'
import ActivityStreams from '../../activity/ActivityStreams'
import config from '../../../config'
import log from '../../log'
import { extractMongoOpts } from '../mongoUtils'

const USER_DB_NAME = '_ns_user'

const databases = {}

class DomainDatabase extends Database {
  constructor(opts) {
    super(opts)
    this.domainId = opts.domainId
    this.Domain = opts.Domain
    this.getInfo = this.getInfo.bind(this)
  }
  async getInfo() {
    return await this.Domain
      .findById(
        this.domainId,
        'domainName smallLogo largeLogo facebookAppId facebookAppSecret getStreamKey getStreamSecret'
      )
      .exec()
  }
  async prepare(rebuildIndexes) {
    await super.prepare(rebuildIndexes)
    const { getStreamKey, getStreamSecret } = await this.getInfo()
    this.activityStreams = new ActivityStreams({
      key: getStreamKey,
      secret: getStreamSecret,
      db: this
    })
  }
}

export default {
  forEach: function(cb) {
    return Object.values(databases).forEach(cb)
  },
  get: function(domainName) {
    return databases[domainName]
  },
  prepareDatabase: async function(Domain, domain, rebuildIndexes) {
    const name = domain.domainName.replace(/\./g, '_')
    const CONNECTION_OPTS = Object.assign({}, extractMongoOpts(config), {
      database: name
    })
    const database = new DomainDatabase({
      Domain,
      domainId: domain._id,
      name: name,
      connectionOpts: CONNECTION_OPTS,
      factories: [
        UserFactory,
        OnboardingTagsFactory,
        DraftFactory,
        PostFactory,
        UserFollowersFactory,
        TagFollowersFactory,
        ActivityFactory,
        TagTimelineFactory,
        AggregatedTagTimelineFactory
      ]
    })
    await database.prepare(rebuildIndexes)
    databases[domain.domainName] = database
  },
  prepare: async function(Domain, rebuildIndexes) {
    const domains = await Domain.find({}).exec()
    let promises = []
    log.info(`preparing ${domains.length} domains ...`)
    // wait for all domain db's to be prepared
    await Promise.all(
      domains.map(domain => {
        return this.prepareDatabase(Domain, domain, rebuildIndexes)
      })
    )
    return this
  }
}
