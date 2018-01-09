'use strict'

const DEFAULT_LIMIT = 30
const TAG_UPDATE_OPERATIONS = ['publish', 'republish', 'unpublish']

import stream from 'getstream'
import TagStreams from './TagStreams'
import {
  collectActivityEntities,
  collectGroupedActivityEntities,
  collectPosts,
  collectUsers
} from './enrichment'

class ActivityStreams {
  constructor({ key, secret, db }) {
    this.db = db
    this.stream = stream.connect(key, secret)
    this.tags = new TagStreams(db)
  }
  async storeActivity(entityType, entityId, activity) {
    const { Activity } = this.db
    return Activity.create({
      entityType,
      entityId,
      activity
    })
  }
  maybeEnqueueTagUpdate({ activity }) {
    if (TAG_UPDATE_OPERATIONS.find(op => op === activity.verb)) {
      if (activity.tags && activity.tags.length) {
        setImmediate(async () => {
          try {
            await this.tags.enqueueUpdate(activity)
          } catch (err) {
            console.error(err)
          }
        })
      }
    }
  }
  async publish(entityType, entityId, activity) {
    const { _doc: storedActivity } = await this.storeActivity(
      entityType,
      entityId,
      activity
    )
    const feed = this.stream.feed(entityType, entityId)
    const streamActivity = await feed.addActivity({
      ...storedActivity.activity,
      foreign_id: storedActivity._id
    })
    this.maybeEnqueueTagUpdate(storedActivity)
    return storedActivity
  }
  /**
  * record the activity locally but don't publish it to getstream feeds
  */
  async record(entityType, entityId, activity) {
    const { _doc: storedActivity } = await this.storeActivity(
      entityType,
      entityId,
      activity
    )
    this.maybeEnqueueTagUpdate(storedActivity)
    return storedActivity
  }
  async loadTimeline(type, feed_id, limit, before) {
    const feedGroupName = type === 'flat' ? 'timeline' : 'timeline_aggregated'
    const feedGroup = this.stream.feed(feedGroupName, feed_id)
    let activities = undefined
    if (before && limit) {
      activities = await feedGroup.get({ limit, id_lt: before })
    } else {
      activities = await feedGroup.get({ limit: limit || DEFAULT_LIMIT })
    }
    let result = undefined
    if (type === 'flat') {
      result = await collectActivityEntities(this.db, activities.results)
    } else {
      result = await collectGroupedActivityEntities(this.db, activities.results)
    }
    return result
  }
  async loadTagTimeline(tag, follower_id, limit, before) {
    const timeline = await this.tags.loadTagTimeline(
      tag,
      follower_id,
      limit || DEFAULT_LIMIT,
      before
    )
    const posts = await collectPosts(this.db, timeline.map(e => e.post))
    const authors = await collectUsers(
      this.db,
      Object.values(posts).map(p => p.author)
    )
    return {
      values: timeline,
      extra: {
        posts,
        authors
      }
    }
  }
  async loadTagTimelines(follower_id, limit, before) {
    const timelines = await this.tags.loadTagTimelines(
      follower_id,
      limit || DEFAULT_LIMIT,
      before
    )
    const posts = await collectPosts(
      this.db,
      timelines.reduce((r, t) => r.concat(t.posts), [])
    )
    const authors = await collectUsers(
      this.db,
      Object.values(posts).map(p => p.author)
    )
    return {
      values: timelines,
      extra: {
        posts,
        authors
      }
    }
  }
  async followTags(tags, follower_id) {
    return await this.tags.followAll(tags, follower_id)
  }
  async followTag(tag, follower_id) {
    return await this.tags.follow(tag, follower_id)
  }
  async unfollowTag(tag, follower_id) {
    return await this.tags.unfollow(tag, follower_id)
  }
  async followUser(user_id, follower_id) {
    const streams = this.stream
    // cause follower's flat timeline to follow user
    const timeline = streams.feed('timeline', follower_id)
    const timelinePromise = timeline.follow('user', user_id)
    // cause follower's aggregated timeline to follow user
    const aggregated = streams.feed('timeline_aggregated', follower_id)
    const aggregatedPromise = aggregated.follow('user', user_id)
    // update our local records of who follows who
    const { UserFollowers } = this.db
    const followPromise = UserFollowers.findOneAndUpdate(
      {
        followed: user_id,
        follower: follower_id
      },
      {
        followed: user_id,
        follower: follower_id
      },
      { upsert: true, new: true }
    ).exec()
    // push a "follow" activity to our local store and to getstream
    const publishedFollowActivity = this.publish('user', follower_id, {
      actor: follower_id,
      object: `user:${user_id}`,
      verb: 'follow'
    })
    const [
      timelineResult,
      aggregatedResult,
      followResult,
      publishResult
    ] = await Promise.all([
      timelinePromise,
      aggregatedPromise,
      followPromise,
      publishedFollowActivity
    ])
    // push a notification to the followed user
    const notificationResult = await this.notify(
      user_id,
      publishResult.activity
    )
    return {
      success: true,
      timelineResult,
      aggregatedResult,
      followResult,
      publishResult
    }
  }
  async unfollowUser(user_id, follower_id) {
    const { UserFollowers } = this.db
    // update our local records of who follows who
    const unfollowResult = await UserFollowers.remove({
      followed: user_id,
      follower: follower_id
    }).exec()
    if (unfollowResult.result && unfollowResult.result.ok) {
      // the relationship did previously exist, so we need to tell getstream
      // to remove it
      const streams = this.stream
      // cause follower's flat timeline to unfollow user
      const timeline = streams.feed('timeline', follower_id)
      const timelinePromise = timeline.unfollow('user', user_id)
      // cause follower's aggregated timeline to unfollow user
      const aggregated = streams.feed('timeline_aggregated', follower_id)
      const aggregatedPromise = aggregated.unfollow('user', user_id)
      const [timelineResult, aggregatedResult] = await Promise.all([
        timelinePromise,
        aggregatedPromise
      ])
      return {
        success: true,
        timelineResult,
        aggregatedResult,
        unfollowResult
      }
    } else {
      return {
        success: false,
        unfollowResult
      }
    }
  }
  notify(user_id, activity) {
    const notification = this.stream.feed('notification', user_id)
    return notification.addActivity(activity)
  }
}

export default ActivityStreams
