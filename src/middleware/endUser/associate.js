'use strict'

export const associateDomainWithContext = service => {
  return async (ctx, next) => {
    let domain = ctx.header['x-forwarded-host'] || ctx.hostname
    domain = domain.split(':')[0]
    ctx.state.service = service.get(domain)
    ctx.state.domain = domain
    if (ctx.state.service) {
      ctx.request.service = ctx.state.service // because passport :(
      await next()
    } else {
      ctx.throw(404, `Invalid Domain ${domain}`)
    }
  }
}

const init = (app, service) => {
  // binds a domain-specific service to the context - if one is found -
  // and bails out with an error if no db is found matching the hostname
  // that was requested
  app.use(associateDomainWithContext(service))
}

export default init
