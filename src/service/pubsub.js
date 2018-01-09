'use strict'

import kafkaish from 'kafkaish'

/**
 * Note: the pubsub API is using callback's instead of async/await so that we
 *       don't have to await and then deal with error's if we just want to
 *       fire and forget, which we typically do.
 */

const newPubSubTopic = async (name, uri, opts) => {
  const conn = await kafkaish(uri, opts).connect()
  const topic = await conn.prepareTopic(name)
  return topic
}

export default newPubSubTopic
