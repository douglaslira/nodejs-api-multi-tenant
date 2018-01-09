'use strict'

import { createRange } from '../../../utils/ranges'

const init = (router, adminServices, endUserServices) => {
  router.get('/domains/:id/onboarding/:language/tags', async (ctx, next) => {
    const domainDescriptor = await adminServices.Domain.findById(ctx.params.id)
    if (!domainDescriptor) {
      ctx.throw(404, 'no_such_domain')
    } else {
      const domainService = endUserServices.get(domainDescriptor.domainName)
      const OnboardingTags = domainService.OnboardingTags
      const language = ctx.params.language
      if (language === '_ALL') {
        const values = await OnboardingTags.find({})
          .select({
            _id: 1,
            language: 1,
            tags: 1
          })
          .sort({
            language: 1
          })
          .exec()
        ctx.body = {
          range: createRange(0, values, values.length),
          values
        }
      } else {
        const result = await OnboardingTags.findOne({
          language: ctx.params.language
        }).exec()
        ctx.body = result.tags || []
      }
    }
  })

  router.post(
    '/domains/:id/onboarding/:language/tags/_new',
    async (ctx, next) => {
      await upsertTags(ctx, adminServices, endUserServices)
    }
  )

  router.post(
    '/domains/:id/onboarding/:language/tags/:tagsId',
    async (ctx, next) => {
      await upsertTags(ctx, adminServices, endUserServices)
    }
  )
}

const upsertTags = async (ctx, adminServices, endUserServices) => {
  const domainDescriptor = await adminServices.Domain.findById(ctx.params.id)
  if (!domainDescriptor) {
    ctx.throw(404, 'no_such_domain')
  } else {
    const domainService = endUserServices.get(domainDescriptor.domainName)
    const { request: { body: { tags } } } = ctx
    const language = ctx.params.language
    const result = await domainService.OnboardingTags
      .findOneAndUpdate(
        {
          language
        },
        {
          language,
          tags
        },
        {
          upsert: true,
          new: true
        }
      )
      .exec()
    ctx.body = result.tags || []
  }
}

export default init
