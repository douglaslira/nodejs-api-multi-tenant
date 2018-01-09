'use strict'

const service = (adminDB, domainDBs) => {
  return {
    pubsub: adminDB.pubsub,
    filestore: adminDB.filestore,
    Administrator: adminDB.Administrator,
    Domain: adminDB.Domain,
    newDomain: async (opts, createdBy) => {
      if (domainDBs.get(opts.domainName)) {
        throw new Error(`${opts.domainName} already exists`)
      } else {
        await domainDBs.prepareDatabase(adminDB.Domain, opts, true)
        const { Domain } = adminDB
        const domain = await Domain.create({
          ...opts,
          createdBy
        })
        return domain
      }
    }
  }
}

export default service
