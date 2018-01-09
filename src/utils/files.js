import os from 'os'
import fs from 'fs'
import path from 'path'
import uuid from 'uuid/v1'

export const writeTempFileFromBuffer = async buffer => {
  return new Promise((resolve, reject) => {
    const name = uuid()
    const file = path.join(os.tmpdir(), name)
    const dest = fs.createWriteStream(file)
    dest.on('finish', function() {
      fs.stat(file, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve({
            path: file,
            size: result.size
          })
        }
      })
    })
    dest.on('error', function(err) {
      reject(err)
    })
    dest.write(buffer, 'binary')
    dest.end()
  })
}
