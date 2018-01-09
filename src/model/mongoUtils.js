'use strict'

import log from '../log'

const mongoose = require('mongoose')
mongoose.Promise = Promise // es6 promises

export const extractMongoOpts = config => {
  return Object.getOwnPropertyNames(config)
    .filter(name => /^mongo/.test(name))
    .reduce((result, name) => {
      result[name.substring(5).toLowerCase()] = config[name]
      return result
    }, {})
}

export const createConnectionString = options => {
  const credentials = options.user ? `${options.user}:${options.password}@` : ''
  const replicaSet = options.replicaset
    ? `&replicaSet=${options.replicaset}`
    : ''
  const authSource = options.user ? '&authSource=admin' : ''
  return `mongodb://${credentials}${options.hosts}/${options.database}?ssl=${options.ssl}${replicaSet}${authSource}`
}

export const ensureIndexes = models => {
  models.forEach(model => {
    model.once('index', err => {
      if (err) {
        log.error('Problem while indexing the Domains collection', err)
      } else {
        log.info(`${model.modelName} collection is ready.`)
      }
    })
  })
  return readyQueue(models)
}

export const readyQueue = models => {
  return new Promise((resolve, reject) => {
    let queue = models.map(model => model.modelName)
    models.forEach(model => {
      model.on('index', err => {
        if (err) {
          reject(
            `gave up waiting due to indexing failure in ${model.modelName}`,
            err
          )
        } else {
          queue = queue.filter(name => name !== model.modelName)
          if (queue.length === 0) resolve()
        }
      })
      model.ensureIndexes()
      return model
    })
  })
}
