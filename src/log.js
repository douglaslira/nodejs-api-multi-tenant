'use strict'

var logs = require('bunyan')
var log = logs.createLogger({ name: 'app' })

// replace console logging methods so that any call to console.log / console.error / etc
// actually gets directed through bunyan ...
console.debug = function() {
  log.debug.apply(log, arguments)
}
console.log = function() {
  log.info.apply(log, arguments)
}
console.info = console.log
console.error = function() {
  log.error.apply(log, arguments)
}
console.trace = function() {
  log.trace.apply(log, arguments)
}
console.warn = function() {
  log.warn.apply(log, arguments)
}
console.fatal = function() {
  log.fatal.apply(log, arguments)
}

export default log
