'use strict'

require('babel-core/register')
const Koa = require('koa')

const config = require('./config')
const services = require('./src/bootstrap').default
const log = require('./src/log').default

const adminAPI = require('./src/adminAPI')
const endUserAPI = require('./src/endUserAPI')

const init = async () => {
  try {
    const service = await services()
    const endUser = new Koa()
    endUserAPI.init(endUser, service.endUser)
    endUser.listen(config.endUserBindPort)
    log.info(`end-user API's listening on port ${config.endUserBindPort}`)

    const admin = new Koa()
    adminAPI.init(admin, service.admin, service.endUser)
    admin.listen(config.adminBindPort)
    log.info(`admin API's listening on port ${config.adminBindPort}`)
  } catch (err) {
    console.error(err)
    throw err
  }
}

init()
