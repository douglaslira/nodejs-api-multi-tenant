'use strict'

const jwt = require('jwt-simple')

export const now = () => new Date().getTime() / 1000

export const encoder = ({ secret, expireInSeconds, time = now }) => {
  return payload => {
    return jwt.encode(
      {
        exp: time() + expireInSeconds,
        ...payload
      },
      secret
    )
  }
}

export const decoder = ({ secret }) => {
  return encoded => {
    return jwt.decode(encoded, secret)
  }
}
