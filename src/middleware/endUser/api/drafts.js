import mongoose from 'mongoose'
const ValidationError = mongoose.Error.ValidationError
import serialize_profile from '../serialize_profile'
import crypto from 'crypto'
import { computeAverageReadTime } from '../../../utils/readTime'
import { createRange } from '../../../utils/ranges'

const summarize_draft = function(draft) {
  return {
    _id: draft._id,
    type: draft.type,
    language: draft.language,
    title: draft.title,
    image: draft.image,
    author: serialize_profile(draft.author),
    modified: draft.modified,
    created: draft.created,
    tags: draft.tags
  }
}

const extractTitle = content => {
  if (content && content.blocks) {
    const firstH2Block = content.blocks.find(
      block => block.type === 'header-two'
    )
    if (firstH2Block) {
      return firstH2Block.text
    } else {
      const firstUnstyledBlockWithText = content.blocks.find(
        block => block.type === 'unstyled' && block.text && block.text.length
      )
      if (firstUnstyledBlockWithText) return firstUnstyledBlockWithText.text
    }
  }
  return undefined
}

const extractImage = content => {
  if (content && content.entityMap) {
    const em = content.entityMap
    const firstImageKey = Object.getOwnPropertyNames(em).find(
      name => em[name].type === 'image'
    )
    if (firstImageKey) {
      return em[firstImageKey].data
    }
  }
  return undefined
}

const extractMentions = content => {
  if (content && content.entityMap) {
    const em = content.entityMap
    const mentions = Object.getOwnPropertyNames(em)
      .filter(name => {
        return em[name].type === 'MENTION'
      })
      .map(name => `notification:${em[name].data.id}`)
    return mentions
  }
  return []
}

const removeEmpty = (array = []) => {
  return array.filter(e => e && e.length)
}

const createPublishedPostName = draft => {
  const base = draft.title
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\?'\\]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 64)
  let hash = crypto
    .createHash('sha256')
    .update(draft.title)
    .update(JSON.stringify(draft.content))
    .update(new Date().toString())
  return `${base}-${hash.digest('hex').slice(-12)}`
}

const createThread = async (responseTo, Post) => {
  if (responseTo) {
    let parent = await Post.findById(responseTo)
    return parent.thread.concat([responseTo])
  } else {
    return []
  }
}

const init = (router, services) => {
  const handleError = function(ctx, err) {
    console.error(err)
    if (err instanceof ValidationError) {
      ctx.status = 400
      ctx.body = err
    } else {
      ctx.throw(500, err.message, err)
    }
  }

  router.get('/drafts/:filter/:start-:end', async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) ctx.throw(401, 'authentication_required')
    const {
      state: { domain, service: { Draft } },
      params: { filter, start, end }
    } = ctx
    if (filter !== '_ALL') {
      ctx.throw(500, 'todo - filters for drafts are not currently supported')
    } else {
      const skip = parseInt(ctx.params.start) - 1
      const limit = parseInt(ctx.params.end) - skip
      const query = { author: user._id }
      try {
        const count = await Draft.count(query).exec()
        const result = await Draft.find(query)
          .select({
            _id: 1,
            type: 1,
            language: 1,
            title: 1,
            image: 1,
            tags: 1,
            author: 1,
            modified: 1,
            created: 1
          })
          .sort({
            created: -1
          })
          .skip(skip)
          .limit(limit)
          .populate('author')
          .exec()
        ctx.body = {
          range: createRange(skip, result, count),
          values: result.map(summarize_draft)
        }
      } catch (err) {
        handleError(ctx, err)
      }
    }
  })

  router.post('/drafts/_new', async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) ctx.throw(401, 'authentication_required')
    const { state: { service: { Draft } }, request: { body } } = ctx
    try {
      const result = await Draft.create({
        author: user._id,
        language:
          user.locale && user.locale.language ? user.locale.language : 'en', // punting this for now - needs further work
        title: extractTitle(body.content),
        image: extractImage(body.content),
        ...body
      })
      ctx.body = result
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.get('/drafts/:id', async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) ctx.throw(401, 'authentication_required')
    const { state: { service: { Draft } }, params: { id } } = ctx
    try {
      // look up by _id AND author - to ensure that you can't
      // cheekily load someone else's drafts!
      const result = await Draft.findOne({
        _id: id,
        author: user._id
      }).exec()
      if (result) {
        ctx.body = result
      } else {
        ctx.throw(404)
      }
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.post('/drafts/:id', async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) ctx.throw(401, 'authentication_required')
    const {
      state: { service: { Draft } },
      params: { id },
      request: { body }
    } = ctx
    try {
      // look up by _id AND author - to ensure that you can't
      // cheekily load someone else's drafts!
      const result = await Draft.findOneAndUpdate(
        {
          _id: id,
          author: user._id
        },
        {
          ...body,
          title: extractTitle(body.content),
          image: extractImage(body.content),
          author: user._id, // prevent changing the author!
          modified: Date.now()
        },
        {
          new: true
        }
      ).exec()
      if (result) {
        ctx.body = result
      } else {
        ctx.throw(404)
      }
    } catch (err) {
      handleError(ctx, err)
    }
  })

  router.post('/drafts/:id/_publish', async (ctx, next) => {
    const { state: { user } } = ctx
    if (!user) ctx.throw(401, 'authentication_required')
    const {
      state: { service: { Draft, Post, activityStreams } },
      params: { id }
    } = ctx
    try {
      // todo: move most of this to a 'publish' method in `Draft`
      // todo: use pubsub or event-listener to separate concerns - have a subscriber/listener
      //       deal with e.g. updating activity streams and posting notifications

      // look up by _id AND author - to ensure that you can't
      // cheekily publish someone else's drafts!
      const draftPromise = Draft.findOne({
        _id: id,
        author: user._id
      }).exec()
      const existingPromise = Post.findOne({
        draft: id
      }).exec()
      const [draft, existing] = await Promise.all([
        draftPromise,
        existingPromise
      ])
      if (draft) {
        let result = undefined
        let tags = removeEmpty(draft.tags)
        const readTime = computeAverageReadTime(draft.content.blocks)
        if (existing) {
          let existingTags = removeEmpty(existing.tags)
          // updating an already published article
          existing.title = draft.title
          existing.image = draft.image
          existing.content = draft.content
          existing.attachments = draft.attachments
          existing.tags = draft.tags
          existing.readTime = readTime
          existing.modified = new Date()
          result = await existing.save()
          try {
            // todo: set the 'target' field if draft.responseTo is a post id
            await activityStreams.record('user', result.author, {
              actor: result.author,
              verb: 'republish',
              object: `${result.type}:${result._id}`,
              time: result.created,
              to: extractMentions(result.content),
              tags: tags,
              added_tags: tags.filter(d => !existingTags.find(e => e === d)),
              removed_tags: existingTags.filter(e => !tags.find(d => d === e))
            })
          } catch (err) {
            console.error(err)
          }
        } else {
          const now = new Date()
          const thread = await createThread(draft.responseTo, Post)
          result = await Post.create({
            name: createPublishedPostName(draft),
            draft: draft._id,
            type: draft.type,
            author: draft.author,
            title: draft.title,
            image: draft.image,
            content: draft.content,
            language: draft.language,
            attachments: draft.attachments,
            tags: tags,
            readTime,
            created: now,
            modified: now,
            thread: thread
          })
          // Update the responseCount field for all posts in `thread`
          // (todo: extract as an operation triggered by a publish event ...)
          await Post.update(
            {
              _id: { $in: thread }
            },
            {
              $inc: { responseCount: 1 }
            },
            {
              multi: true
            }
          )
          try {
            // todo: set the 'target' field if draft.responseTo is a post id
            await activityStreams.publish('user', result.author, {
              actor: result.author,
              verb: 'publish',
              object: `${result.type}:${result._id}`,
              time: result.created,
              to: extractMentions(result.content),
              tags: tags
            })
            // todo: publish a notification to the author of the responseTo post, if one is set
          } catch (err) {
            console.error(err)
          }
        }
        ctx.body = result
      } else {
        throw new Error('no_such_draft')
      }
    } catch (err) {
      handleError(ctx, err)
    }
  })
}

export default init
