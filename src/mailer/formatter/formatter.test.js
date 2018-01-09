'use strict'

import defaultFormatter from './index'

test('formats confirmation email correctly', () => {
  const result = defaultFormatter.format({
    language: 'en',
    type: 'confirm-registration',
    payload: {
      domainName: 'imaginary-domain.com',
      confirmationUrl: `https://imaginary-domain.com/confirm-registration?jwt=abcd.1234.y1z2`,
      user: {
        username: 'joe-user',
        email: 'joe@user.com'
      }
    }
  })
  expect(result.subject).toBe('Confirm Registration')
  expect(result.html).toMatchSnapshot()
})
