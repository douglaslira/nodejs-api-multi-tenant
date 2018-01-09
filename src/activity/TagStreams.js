'use strict'

export const EVENT_TYPE = 'TAGGED_POST_ACTIVITY'
const INITIAL_POPULATION_SIZE = 50
const MAX_POSTS_PER_AGGREGATE = 6

class TagStreams {
  constructor(db) {
    this.db = db
    this.pubsub = db.pubsub
    this.handleQueue()
  }
  async enqueueUpdate(activity) {
    return new Promise((resolve, reject) => {
      this.pubsub.publish(EVENT_TYPE, activity, err => {
        if (err) {
          console.error(`error while enqueuing tagged activity`, err, activity)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  handleQueue() {
    try {
      const subscription = this.pubsub.subscribe(
        EVENT_TYPE,
        {
          name: 'tagged-activity-handler',
          replay: true
        },
        this.handleActivity.bind(this)
      )
    } catch (e) {
      console.log(e)
    }
  }
  async handleActivity(ev, activity, ack) {
    if (activity.verb === 'publish' || activity.verb === 'republish') {
      const removedTags = activity.removed_tags || []
      const addedTags = activity.added_tags || activity.tags
      let [type, post] = activity.object.split(':')
      await updateTimelinesFollowingTagsToInsertPost(
        addedTags,
        post,
        activity,
        this.db
      )
      await updateTimelinesFollowingTagsToRemovePost(removedTags, post, this.db)
    } else {
      // unpublish / blacklist
      await updateTimelinesFollowingTagsToRemovePost(
        activity.tags,
        post,
        this.db
      )
    }
    await this.doAck(ack)
  }
  async doAck(ack) {
    return new Promise((resolve, reject) => {
      ack(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  async followAll(tags, follower_id) {
    return Promise.all(tags.map(tag => this.follow(tag, follower_id)))
  }
  async follow(tag, follower_id) {
    const { TagFollowers } = this.db
    const result = await TagFollowers.findOneAndUpdate(
      {
        followed: tag,
        follower: follower_id
      },
      {
        followed: tag,
        follower: follower_id
      },
      { upsert: true, new: true }
    ).exec()
    return {
      record: result,
      population: this.populateFollowedTag(tag, follower_id)
    }
  }
  async populateFollowedTag(tag, follower_id) {
    const { Post, TagTimeline, AggregatedTagTimeline } = this.db
    try {
      // todo: when we have groups and restricted visibility this will
      // no longer suffice - we need to find N posts which are visible
      // to this user ...
      const posts = await Post.find({
        tags: tag
      })
        .limit(INITIAL_POPULATION_SIZE)
        .sort({
          created: -1
        })
        .exec()
      const date = new Date()
      const aggregated = await AggregatedTagTimeline.findOneAndUpdate(
        {
          tag,
          follower: follower_id
        },
        {
          modified: date,
          day: clampToDay(date),
          posts: posts.slice(0, MAX_POSTS_PER_AGGREGATE).map(p => p._id)
        },
        {
          upsert: true,
          new: true
        }
      ).exec()
      const timeline = await TagTimeline.insertMany(
        posts.map(p => ({
          tag,
          follower: follower_id,
          post: p._id
        }))
      )
      return {
        aggregated,
        timeline
      }
    } catch (e) {
      console.error(e, tag, follower_id)
      return e // deliberately not throwing, so's not to have unhandled rejections
    }
  }
  async unfollow(tag, follower_id) {
    const { TagFollowers } = this.db
    const remove = await TagFollowers.remove({
      followed: tag,
      follower: follower_id
    }).exec()
    if (remove.result && remove.result.ok) {
      // it did exist and was removed, so we should clean up the timelines too
      const depopulation = this.depopulateUnfollowedTag(tag, follower_id)
      return {
        success: true,
        depopulation
      }
    } else {
      return {
        success: false
      }
    }
  }
  async depopulateUnfollowedTag(tag, follower_id) {
    const { TagTimeline, AggregatedTagTimeline } = this.db
    try {
      // first clean up the aggregated timeline for this follower + tag
      const aggregated = await AggregatedTagTimeline.findOneAndRemove({
        tag,
        follower: follower_id
      }).exec()
      // then remove ALL entries from the follower's flat timeline for this tag
      const timeline = await TagTimeline.remove({
        tag,
        follower: follower_id
      }).exec()
      return {
        aggregated,
        timeline
      }
    } catch (e) {
      console.error(e, tag, follower_id)
      return e
    }
  }
  loadTagTimeline(tag, follower_id, limit, id_lt) {
    const { TagTimeline } = this.db
    let query = {
      tag,
      follower: follower_id
    }
    if (id_lt) {
      query[_id] = {
        $lt: id_lt
      }
    }
    return TagTimeline.find(query).sort({ _id: -1 }).limit(limit).exec()
  }
  loadTagTimelines(follower_id, limit, modified_before) {
    const { AggregatedTagTimeline } = this.db
    const query = {
      follower: follower_id
    }
    if (modified_before) {
      query[modified] = { $lt: modified_before }
    }
    return AggregatedTagTimeline.find(query)
      .sort({ day: -1, tag: -1 })
      .limit(limit)
      .exec()
  }
}

export const clampToDay = date => {
  return `${date.getUTCFullYear()}${date.getUTCMonth()}${date.getUTCDate()}`
}

export const hasVisibility = (user, activity) => true // todo: needs to change once we have groups

export const updateTimelinesFollowingTagsToInsertPost = async (
  tags,
  post,
  activity,
  db
) => {
  const { TagFollowers, TagTimeline, AggregatedTagTimeline } = db
  let tag = undefined
  let cursor = undefined
  for (let i = 0; i < tags.length; i++) {
    tag = tags[i]
    cursor = TagFollowers.find({ followed: tag }).cursor()
    try {
      await cursor.eachAsync(follower => {
        if (hasVisibility(follower, activity)) {
          const timeline = TagTimeline.findOneAndUpdate(
            {
              tag,
              follower: follower.follower,
              post
            },
            {
              tag,
              follower: follower.follower,
              post
            },
            {
              upsert: true,
              new: true
            }
          )
          const aggregated = AggregatedTagTimeline.findOneAndUpdate(
            {
              tag,
              follower: follower.follower
            },
            {
              modified: activity.time,
              day: clampToDay(activity.time),
              $push: {
                posts: {
                  $each: [post],
                  $position: 0, // insert the post at index 0
                  $slice: MAX_POSTS_PER_AGGREGATE // slice the oldest out, keeping MAX_POSTS_PER_AGGREGATE
                }
              }
            },
            {
              upsert: true,
              new: true
            }
          )
          return Promise.all([timeline, aggregated])
        }
      })
    } catch (e) {
      console.error(e)
    }
  }
}

export const updateTimelinesFollowingTagsToRemovePost = async (
  tags,
  post,
  db
) => {
  const { TagTimeline, AggregatedTagTimeline } = db
  let tag = undefined
  for (let i = 0; i < tags.length; i++) {
    tag = tags[i]
    const timeline = TagTimeline.remove({
      tag,
      post
    })
    const aggregated = AggregatedTagTimeline.update(
      {
        tag,
        posts: post
      },
      {
        $pull: { posts: post }
      },
      {
        multi: true
      }
    )
    await Promise.all([timeline, aggregated])
  }
}

export default TagStreams
