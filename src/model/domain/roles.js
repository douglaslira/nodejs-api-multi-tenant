export const ROLE_NAMES = ['ADMIN', 'USER']

const ROLES = ROLE_NAMES.reduce((r, n) => {
  r[n] = n
  return r
}, {})

export default ROLES
