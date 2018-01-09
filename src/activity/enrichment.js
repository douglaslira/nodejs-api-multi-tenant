export const extractActivityEntities = activities => {
  const result = {
    user: new Set(),
    post: new Set()
  }
  activities.forEach(a => {
    result[a.object.type].add(a.object.id)
    result[a.origin.type].add(a.origin.id)
    result[a.actor.type].add(a.actor.id)
    if (a.target) result[a.target.type].add(a.target.id)
  })
  return result
}

export const mapById = entities => {
  return entities.reduce((r, e) => {
    r[e._id] = e
    return r
  }, {})
}

export const splitIdentifier = identifier => {
  if (identifier) {
    const [type, id] = identifier.split(':')
    if (id) {
      let t = type === 'user' ? 'user' : 'post'
      return { type: t, id }
    } else {
      // id didn't have the format type:id
      return { type: 'user', id: type }
    }
  } else {
    return undefined
  }
}

export const splitIdentifiers = activities => {
  return activities.map(a => {
    return {
      ...a,
      actor: splitIdentifier(a.actor),
      object: splitIdentifier(a.object),
      target: splitIdentifier(a.target),
      origin: splitIdentifier(a.origin)
    }
  })
}

export const collectActivityEntities = async (service, raw) => {
  const activities = splitIdentifiers(raw)
  const entities = extractActivityEntities(activities)
  const usersPromise = service.User.find({ _id: { $in: [...entities.user] } })
  const postsPromise = service.Post
    .find({ _id: { $in: [...entities.post] } })
    .populate('author')
  const [users, posts] = await Promise.all([usersPromise, postsPromise])
  return {
    values: activities,
    extra: {
      user: mapById(users),
      post: mapById(posts)
    }
  }
}

export const extractActors = activities => {
  return activities.reduce((r, a) => {
    r[a.actor.id] = a.actor
    return r
  }, {})
}

export const collectGroupedActivityEntities = async (service, raw) => {
  let entities = {
    user: new Set(),
    post: new Set()
  }
  const groups = raw.map(group => {
    const activities = splitIdentifiers(group.activities)
    const ents = extractActivityEntities(activities)
    const actors = extractActors(activities)
    ents.user.forEach(u => entities.user.add(u))
    ents.post.forEach(p => entities.post.add(p))
    return {
      ...group,
      actors,
      activities
    }
  })
  const usersPromise = service.User.find({ _id: { $in: [...entities.user] } })
  const postsPromise = service.Post.find({ _id: { $in: [...entities.post] } })
  const [users, posts] = await Promise.all([usersPromise, postsPromise])
  return {
    values: groups,
    extra: {
      user: mapById(users),
      post: mapById(posts)
    }
  }
}

export const collectPosts = async (service, postIds) => {
  const posts = await service.Post
    .find({
      _id: { $in: postIds }
    })
    .select({
      _id: 1,
      name: 1,
      type: 1,
      draft: 1,
      language: 1,
      title: 1,
      image: 1,
      tags: 1,
      author: 1,
      modified: 1,
      created: 1,
      readTime: 1
    })
    .exec()
  return mapById(posts)
}

export const collectUsers = async (service, userIds) => {
  const users = await service.User
    .find({
      _id: { $in: userIds }
    })
    .select({
      _id: 1,
      username: 1,
      firstname: 1,
      lastname: 1,
      avatar: 1
    })
    .exec()
  return mapById(users)
}
