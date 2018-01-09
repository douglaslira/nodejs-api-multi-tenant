const init = (router, service) => {
  router.post('/uploads', async (ctx, next) => {
    const { request: { body: { files } = {} } = {} } = ctx
    if (files) {
      const uploads = Object.values(files).map(f =>
        service.filestore.copyFromFile(f)
      )
      ctx.body = await Promise.all(uploads)
    } else {
      ctx.throw(400, 'No files were uploaded')
    }
  })
}

export default init
