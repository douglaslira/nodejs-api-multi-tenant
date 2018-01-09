'use strict'

import { readyQueue } from '../mongoUtils'
import { generatePassword } from '../../utils/passwords'
import config from '../../../config'
import log from '../../log'

export const ensureDefaultAdminUserExists = async Administrator => {
  const existing = await Administrator.findByEmail(config.adminEmail)
  if (!existing) {
    const password = generatePassword(config.adminEmail, new Date().toString())
    const created = await Administrator.register({
      email: config.adminEmail,
      password: password
    })
    log.warn(
      `created new default admin user with email ${created.email}, password: "${password}" (please change asap).`
    )
    return created
  } else {
    log.info(`default admin user exists with email ${existing.email}.`)
    return existing
  }
}

const bootstrap = async Administrator => {
  await readyQueue([Administrator])
  await ensureDefaultAdminUserExists(Administrator)
}

export default bootstrap
