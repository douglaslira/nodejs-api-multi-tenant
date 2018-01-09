const koaBunyanLogger = require('koa-bunyan-logger')

const logging = app => {
  app.use(koaBunyanLogger())
  app.use(koaBunyanLogger.requestIdContext())
  app.use(koaBunyanLogger.requestLogger())
  app.on('error', function() {}) // suppress raw logging of errors - we want bunyan to handle it
}

export default logging
