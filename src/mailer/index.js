import Mailer from './mailer'

import transport from './transport'
import formatter from './formatter'

const newMailer = (pubsub, opts) => {
  return new Mailer(
    pubsub,
    (opts && opts.transport) || transport,
    (opts && opts.formatter) || formatter,
    opts
  )
}

export default newMailer
