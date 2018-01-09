'use strict'

import Database from '../Database'
import AdministratorFactory from './AdministratorFactory'
import DomainFactory from './DomainFactory'
import config from '../../../config'
import { extractMongoOpts } from '../mongoUtils'

const ADMIN_DB_NAME = '_ns_admin'

const CONNECTION_OPTS = Object.assign({}, extractMongoOpts(config), {
  database: ADMIN_DB_NAME
})

const adminDB = new Database({
  name: ADMIN_DB_NAME,
  connectionOpts: CONNECTION_OPTS,
  factories: [AdministratorFactory, DomainFactory]
})

export default adminDB
