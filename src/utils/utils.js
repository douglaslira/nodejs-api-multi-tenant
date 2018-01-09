'use strict'

export const rootDomainExtractor = domain => {
  if (!domain || !domain.length) throw new Error(`invalid domain '${domain}'`)
  const parts = domain.split('.')
  if (parts.length < 2) throw new Error(`invalid domain '${domain}'`)
  return parts.slice(-2).join('.')
}

export const emailOriginCreator = (domainName, prefix = 'no-reply') => {
  return `${domainName} <${prefix}@${rootDomainExtractor(domainName)}>`
}

/**
 * Like Object.assign(a,b), except that Object.assign will overwrite, but
 * sometimes we just want to update an object to fill in missing properties
 * without overwriting existing values. Example:
 *
 * Object.assign({ foo:'bar' }, { whiz:'bang', foo:undefined }) // produces { foo:undefined, whiz:'bang' }
 * assignWithoutOverwrite({ foo:'bar' }, { whiz:'bang', foo:undefined }) // produces { foo:'bar', whiz:'bang'}
 */
export const assignWithoutOverwrite = function(a, b) {
  if (a && !b) return Object.assign({}, a)
  if (b && !a) return Object.assign({}, b)
  const result = Object.assign({}, a)
  Object.getOwnPropertyNames(b).forEach(name => {
    if (!result[name]) {
      result[name] = b[name]
    }
  })
  return result
}
