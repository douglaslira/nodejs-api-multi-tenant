'use strict'

export const DEFAULT_LOCALE = {
  value: 'en-GB',
  language: 'en',
  region: 'GB'
}

export const convertOne = function(value) {
  const [language, region] = value.split('-')
  if (region) {
    return {
      value,
      language,
      region
    }
  } else {
    return {
      value,
      language
    }
  }
}

export const extractFromHeader = function(languages, multi) {
  if (languages.length) {
    if (multi) {
      return languages.map(convertOne)
    } else {
      return convertOne(languages[0])
    }
  }
}

export const getLocale = function(ctx, multi) {
  const { state: { user = {} } = {} } = ctx
  if (multi) {
    const result = extractFromHeader(ctx.acceptsLanguages(), true)
    if (user.locale) {
      result.unshift(user.locale)
    }
    if (!result.length) {
      return [DEFAULT_LOCALE]
    } else {
      return result
    }
  } else {
    if (user && user.locale) {
      return user.locale
    }
    const result = extractFromHeader(ctx.acceptsLanguages(), false)
    return result || DEFAULT_LOCALE
  }
}

const init = app => {
  app.use(async (ctx, next) => {
    ctx.getLocale = multi => getLocale(ctx, multi)
    await next()
  })
}

export default init
