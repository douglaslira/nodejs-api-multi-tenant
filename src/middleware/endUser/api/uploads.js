const init = (router, services) => {
  router.post('/uploads', async (ctx, next) => {
    const {
      state: { domain, service: { filestore } },
      request: { body: { files } = {} } = {}
    } = ctx
    if (files) {
      const uploads = Object.values(files).map(f => filestore.copyFromFile(f))
      ctx.body = await Promise.all(uploads)
    } else {
      ctx.throw(400, 'No files were uploaded')
    }
  })
}

export default init
