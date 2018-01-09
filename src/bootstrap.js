'use strict'

import adminDB from './model/admin/AdminDatabase'
import domainDBs from './model/domain/DomainDatabases'
import ensureDefaultAdmin from './model/admin/defaultAdmin'

import adminServices from './service/admin'
import endUserServices from './service/endUser'

const semver = require('semver')

const COMPATIBLE_NODE_VERSIONS = '>=8.1.2 <9.0.0'
if (!semver.satisfies(process.version, COMPATIBLE_NODE_VERSIONS))
  throw new Error(
    `node version must be ${COMPATIBLE_NODE_VERSIONS}, but you are running ${process.version}`
  )

const prepare = async buildIndexesAndShutDown => {
  await adminDB.prepare(buildIndexesAndShutDown)
  // ensure that the default administrator (from env) is created
  const defaultAdmin = ensureDefaultAdmin(adminDB.Administrator)

  // prepare all of the domain databases
  const domains = domainDBs.prepare(adminDB.Domain, buildIndexesAndShutDown)

  if (buildIndexesAndShutDown) {
    await defaultAdmin
    await domains
    process.exit(0)
  } else {
    return new Promise(async (resolve, reject) => {
      await defaultAdmin
      const dbs = await domains
      resolve({
        admin: adminServices(adminDB, dbs),
        endUser: endUserServices(dbs)
      })
    })
  }
}

export default prepare
