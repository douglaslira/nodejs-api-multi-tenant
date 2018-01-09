'use strict'

const init = router => {
  router.get('/info', async (ctx, next) => {
    const { state: { service } } = ctx
    const info = await service.getInfo()
    // being careful not to expose anything sensitive, e.g.
    // the facebookAppSecret!
    ctx.body = {
      domainName: info.domainName,
      smallLogo: info.smallLogo,
      largeLogo: info.largeLogo,
      facebookAppId: info.facebookAppId
    }
  })

  router.get('/onboarding/tags', async (ctx, next) => {
    const { getLocale, state: { service: { OnboardingTags } } } = ctx
    const locale = getLocale()
    // find onboarding tags in the appropriate language, if they exist
    let tags = await OnboardingTags.findOne({ language: locale.language })
    if (!tags) tags = await OnboardingTags.findOne({}) // any one that exists!
    ctx.body = tags || []
  })
}

export default init
