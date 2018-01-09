import serialize_profile from '../serialize_profile'

const init = router => {
  router.get('/profile', async (ctx, next) => {
    const user = ctx.state.user
    if (user) {
      ctx.body = serialize_profile(user)
    } else {
      ctx.throw(401, 'authentication_required')
    }
  })
}

export default init

// curl -H "Content-Type: application/json" -X POST -d '{"email":"steveliles@gmail.com","password":"9e8d135c1a"}' http://localhost:3003/aa/login
// curl -H "Content-Type: application/json" --cookie "sid=eyJwYXNzcG9ydCI6eyJ1c2VyIjoiNTk2ZDIxYjA1MjdhZjM0MjQzZmIzMjQ0In0sIl9leHBpcmUiOjE1MDAzODY4NTUxMDMsIl9tYXhBZ2UiOjEyMDAwMDB9;sid.sig=fKIdvt6x5dcWf3LKrljsvzaa4u0" -X GET http://localhost:3003/aa/profile
