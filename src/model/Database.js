'use strict'

import AWS from 'aws-sdk'
import uuid from 'uuid/v1'
import os from 'os'
import fs from 'fs'
import path from 'path'
import s3Stream from 's3-upload-stream'
import mongooseBeautifulUniqueValidation from 'mongoose-beautiful-unique-validation'
import log from '../log'
import { ensureIndexes, createConnectionString } from './mongoUtils'
import newPubSubTopic from '../service/pubsub'
import fetch from 'node-fetch'

const mongoose = require('mongoose')
mongoose.Promise = Promise
mongoose.plugin(mongooseBeautifulUniqueValidation)

const s3 = new AWS.S3()
const filestore = s3Stream(s3)

const connect = opts => {
  return mongoose.createConnection(createConnectionString(opts), {
    useMongoClient: true
  })
}

const dotifyName = domain => domain.split('_').filter(n => n.length).join('.')

const downloadToTempFile = async url => {
  const name = uuid()
  const file = path.join(os.tmpdir(), name)
  let type
  return fetch(url).then(res => {
    type = res.headers.get('content-type') || 'object/application-octet-stream'
    let dest = fs.createWriteStream(file)
    let stream = res.body.pipe(dest)
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        fs.lstat(file, (err, stats) => {
          if (err) {
            reject(err)
          } else {
            resolve({
              path: file,
              type: type,
              name: name,
              size: stats.size
            })
          }
        })
      })
    })
  })
}

class FileStore {
  constructor(opts) {
    this.s3 = opts.s3
    this.bucketName = opts.bucketName
  }
  async put(readStream, name, size, type) {
    return await new Promise((resolve, reject) => {
      try {
        const key = uuid()
        const upload = filestore.upload({
          Bucket: this.bucketName,
          Key: key,
          ACL: 'public-read'
        })
        upload.on('error', error => {
          reject(error)
        })
        upload.on('uploaded', details => {
          resolve({
            uuid: details.Key,
            originalFileName: name,
            originalFileSize: size,
            contentType: type
          })
        })
        readStream.pipe(upload)
      } catch (err) {
        reject(err)
      }
    })
  }
  async copyFromFile(file, filename) {
    return this.put(
      fs.createReadStream(file.path),
      filename || file.name,
      file.size,
      file.type
    )
  }
  async copyFromURL(url, filename) {
    const tmp = await downloadToTempFile(url)
    try {
      return await this.copyFromFile(tmp, filename)
    } finally {
      fs.unlink(tmp.path, err => {
        console.error(err)
      })
    }
  }
}

class Database {
  constructor(opts) {
    this.name = opts.name
    this.domainName = dotifyName(opts.name)
    this.connectionOpts = opts.connectionOpts
    this.factories = opts.factories
    this.models = []
  }
  async prepare(rebuildIndexes) {
    // wait for the connection to be established ... (new mongoose behaviour)
    const dbs = new Promise((resolve, reject) => {
      const pendingConnection = connect(this.connectionOpts)
      // stupid mongoose pseudo-promise is not compatible with await or Promise.resolve
      pendingConnection.then(async db => {
        this.connection = db
        try {
          // create all of the models for this database
          this.factories.forEach(factory => {
            const model = factory.create(db)
            this[model.modelName] = model // e.g. now you can do `new Database.Administrator({ ... })`
            this.models.push(model)
          })
          if (rebuildIndexes) {
            // make sure our indexes are all up-to-date
            await ensureIndexes(this.models)
          } else {
            this.models.forEach(m =>
              log.info(`${this.name}.${m.modelName} collection is ready`)
            )
          }

          resolve(this)
        } catch (err) {
          reject(err)
        }
      })
    })

    const files = new Promise((resolve, reject) => {
      const bucketName = this.domainName
      const params = { Bucket: bucketName }
      console.log(`checking existence of s3 bucket ${bucketName}`)
      s3.headBucket(params, err => {
        if (err) {
          if (err.code !== 'NotFound') {
            console.error(err)
            reject(err)
          } else {
            console.log(`creating s3 bucket ${bucketName}`)
            s3.createBucket(params, err => {
              if (err) {
                console.error(err)
                reject(err)
              } else {
                console.log(`s3 bucket ${bucketName} is ready`)
                this.filestore = new FileStore({ s3, bucketName })
                resolve()
              }
            })
          }
        } else {
          console.log(`s3 bucket ${bucketName} already exists.`)
          this.filestore = new FileStore({ s3, bucketName })
          resolve()
        }
      })
    })

    const pubsub = new Promise(async (resolve, reject) => {
      try {
        this.pubsub = await newPubSubTopic(
          'pubsub_general',
          createConnectionString(this.connectionOpts)
        )
        console.log(`${this.domainName} pubsub topic ready.`)
        resolve(this.pubsub)
      } catch (err) {
        console.error(
          `${dotifyName(this.name)} pubsub topic could not be created.`,
          err
        )
        reject(err)
      }
    })

    await Promise.all([dbs, files, pubsub])
  }
}

export default Database
