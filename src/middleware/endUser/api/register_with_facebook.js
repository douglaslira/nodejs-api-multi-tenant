import serialize_profile from '../serialize_profile'
import uuid from 'uuid/v1'

import { generatePassword } from '../../../utils/passwords'
import { assignWithoutOverwrite } from '../../../utils/utils'
import { createUserFromFacebookInfo } from '../MultiDomainFacebookStrategy'
export { createUserFromFacebookInfo } // because legacy tests

import runAsync from '../../../utils/runAsync'

export const FACEBOOK_REGISTRATION_ENDPOINT = '/users/_new/facebook'

const init = router => {
  router.post(FACEBOOK_REGISTRATION_ENDPOINT, async (ctx, next) => {
    const {
      state: {
        service: { mailer, domainName, User, filestore, activityStreams }
      },
      request: { body }
    } = ctx
    await registerWithFacebook(
      ctx,
      User,
      filestore,
      domainName,
      body,
      activityStreams
    )
  })
}

export const registerWithFacebook = async (
  ctx,
  User,
  filestore,
  domain,
  facebookInfo,
  activityStreams
) => {
  if (facebookInfo.email) {
    const existing = await User.findByEmail(facebookInfo.email)
    if (existing) {
      if (existing.facebookUserId) {
        ctx.login({ ...serialize_profile(existing), domain })
        ctx.body = serialize_profile(existing)
        ctx.status = 200
      } else {
        await joinExistingAccountWithFacebookInfo(
          ctx,
          User,
          filestore,
          domain,
          facebookInfo,
          existing
        )
      }
    } else {
      await registerNewAccountFromFacebook(
        ctx,
        User,
        filestore,
        domain,
        facebookInfo,
        activityStreams
      )
    }
  } else {
    await registerNewAccountFromFacebook(
      ctx,
      User,
      filestore,
      domain,
      facebookInfo,
      activityStreams
    )
  }
}

export const createUniqueUsername = async (User, fbInfo) => {
  const { email, name, userID } = fbInfo
  if (!email && !name) return userId
  if (email) {
    const maybeUsername = email.split('@')[0]
    const result = await User.findByUsername(maybeUsername)
    if (!result) return maybeUsername
  }
  const prefix = name
    ? name.toLowerCase().split(' ').join('')
    : email.split('@')[0]
  if (prefix) {
    const maybeUsername = prefix
    const result = await User.findByUsername(maybeUsername)
    if (!result) return maybeUsername
  }
  if (prefix && userID) {
    const maybeUsername = prefix + userID.substring(userID.length - 3)
    const result = await User.findByUsername(maybeUsername)
    if (!result) return maybeUsername
  }
  const maybeUsername = prefix + userID
  const result = await User.findByUsername(maybeUsername)
  if (!result) {
    return maybeUsername
  } else {
    const generated = uuid().split('-').join('')
    return generated.substring(generated.length - 10)
  }
}

export const joinExistingAccountWithFacebookInfo = async (
  ctx,
  User,
  filestore,
  domain,
  facebookInfo,
  existing
) => {
  const fbUser = await createUserFromFacebookInfo(facebookInfo, filestore)
  let update = assignWithoutOverwrite(serialize_profile(existing), fbUser)
  if (!update.verified) {
    // if the user registered by email first, didn't verify their address,
    // then re-registered or tried to login with facebook where the facebook
    // email address matches, their email can now be verified because
    // facebook has already done that check for us.
    update.verified = new Date()
  }
  const result = await User.findOneAndUpdate({ _id: existing._id }, update, {
    new: true
  }).exec()
  ctx.login({ ...serialize_profile(result), domain })
  ctx.body = serialize_profile(result)
  ctx.status = 202 // accepted
}

export const registerNewAccountFromFacebook = async (
  ctx,
  User,
  filestore,
  domain,
  facebookInfo,
  activityStreams
) => {
  const username = await createUniqueUsername(User, facebookInfo)
  const fbUser = await createUserFromFacebookInfo(facebookInfo, filestore)
  if (fbUser.email && fbUser.email.length) {
    // no need to verify the email address since facebook already did that for us
    // but this user won't be able to sign-in with credentials because they don't
    // know their password (it is generated below). They'll be able to set their
    // password via their profile page if they want to.
    fbUser.verified = new Date()
  }
  const password = generatePassword(username, fbUser.facebookUserId)
  const result = await User.register({ username, ...fbUser, password })
  ctx.login({ ...serialize_profile(result), domain })
  ctx.body = serialize_profile(result)
  ctx.status = 201 // created
  runAsync(async () => {
    try {
      await activityStreams.followTags(fbUser.initial_tags, result._id)
    } catch (e) {
      console.error(e)
    }
  })
}

export default init
