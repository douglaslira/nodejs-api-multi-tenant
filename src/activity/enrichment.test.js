'use strict'

import {
  splitIdentifier,
  splitIdentifiers,
  extractActivityEntities,
  mapById,
  collectActivityEntities,
  collectGroupedActivityEntities
} from './enrichment'

describe('splitIdentifier', () => {
  it('splits "user:y" into {type:"user",id:"y"}', () => {
    expect(splitIdentifier('user:y')).toEqual({ type: 'user', id: 'y' })
  })

  it('splits "x:y" into {type:"post",id:"y"}', () => {
    expect(splitIdentifier('x:y')).toEqual({ type: 'post', id: 'y' })
  })

  it('converts "x" into {type:"user",id:"x"}', () => {
    expect(splitIdentifier('x')).toEqual({ type: 'user', id: 'x' })
  })
})

describe('splitIdentifiers', () => {
  it('splits actor, object, target, and origin identifiers from type:id to {type,id}', () => {
    expect(
      splitIdentifiers([
        {
          actor: 'an-actor-id',
          object: 'article:an-article-id',
          target: 'user:a-user-id',
          origin: 'user:another-user-id'
        }
      ])
    ).toEqual([
      {
        actor: { type: 'user', id: 'an-actor-id' },
        object: { type: 'post', id: 'an-article-id' },
        target: { type: 'user', id: 'a-user-id' },
        origin: { type: 'user', id: 'another-user-id' }
      }
    ])
  })
})

describe('mapById', () => {
  it('maps an array of objects with _id properties into an associative-array keyed by _id', () => {
    expect(
      mapById([
        { _id: 'a', foo: 'bar' },
        { _id: 'c', foo: 'yeah' },
        { _id: 'b', foo: 'wat?' }
      ])
    ).toEqual({
      a: { _id: 'a', foo: 'bar' },
      c: { _id: 'c', foo: 'yeah' },
      b: { _id: 'b', foo: 'wat?' }
    })
  })
})

describe('extractActivityEntities', () => {
  it('collects sets of entity ids per type', () => {
    const result = extractActivityEntities([
      {
        actor: { type: 'user', id: 'an-actor-id' },
        object: { type: 'post', id: 'an-article-id' },
        target: { type: 'user', id: 'a-user-id' },
        origin: { type: 'user', id: 'another-user-id' }
      }
    ])
    expect(result.user.has('an-actor-id')).toBeTruthy()
    expect(result.user.has('a-user-id')).toBeTruthy()
    expect(result.user.has('another-user-id')).toBeTruthy()
    expect(result.post.has('an-article-id')).toBeTruthy()
  })
})

describe('collectActivityEntities', () => {
  it('collects entity references and loads them from mongo', async () => {
    const findUser = jest
      .fn()
      .mockReturnValueOnce([
        { _id: 'an-actor-id' },
        { _id: 'a-user-id' },
        { _id: 'another-user-id' }
      ])
    const populate = jest.fn().mockReturnValueOnce([{ _id: 'an-article-id' }])
    const findPost = jest.fn().mockReturnValueOnce({ populate })
    const service = { User: { find: findUser }, Post: { find: findPost } }
    expect(
      await collectActivityEntities(service, [
        {
          actor: 'an-actor-id',
          object: 'article:an-article-id',
          target: 'user:a-user-id',
          origin: 'user:another-user-id'
        }
      ])
    ).toEqual({
      values: [
        {
          actor: { type: 'user', id: 'an-actor-id' },
          object: { type: 'post', id: 'an-article-id' },
          target: { type: 'user', id: 'a-user-id' },
          origin: { type: 'user', id: 'another-user-id' }
        }
      ],
      extra: {
        user: {
          'an-actor-id': { _id: 'an-actor-id' },
          'a-user-id': { _id: 'a-user-id' },
          'another-user-id': { _id: 'another-user-id' }
        },
        post: {
          'an-article-id': { _id: 'an-article-id' }
        }
      }
    })
    expect(findUser).toBeCalledWith({
      _id: { $in: ['another-user-id', 'an-actor-id', 'a-user-id'] }
    })
    expect(findPost).toBeCalledWith({ _id: { $in: ['an-article-id'] } })
  })
})

describe('collectGroupedActivityEntities', () => {
  it('collects entity references and loads them from mongo', async () => {
    const findUser = jest
      .fn()
      .mockReturnValueOnce([
        { _id: 'an-actor-id' },
        { _id: 'a-user-id' },
        { _id: 'another-user-id' },
        { _id: 'another-actor-id' },
        { _id: '3rd-user-id' }
      ])
    const findPost = jest
      .fn()
      .mockReturnValueOnce([
        { _id: 'an-article-id' },
        { _id: '2nd-article-id' }
      ])
    const service = { User: { find: findUser }, Post: { find: findPost } }
    expect(
      await collectGroupedActivityEntities(service, [
        {
          activities: [
            {
              actor: 'an-actor-id',
              object: 'article:an-article-id',
              target: 'user:a-user-id',
              origin: 'user:another-user-id'
            }
          ]
        },
        {
          activities: [
            {
              actor: 'another-actor-id',
              object: 'article:2nd-article-id',
              target: 'user:3rd-user-id',
              origin: 'user:another-user-id'
            }
          ]
        }
      ])
    ).toEqual({
      values: [
        {
          actors: {
            'an-actor-id': { type: 'user', id: 'an-actor-id' }
          },
          activities: [
            {
              actor: { type: 'user', id: 'an-actor-id' },
              object: { type: 'post', id: 'an-article-id' },
              target: { type: 'user', id: 'a-user-id' },
              origin: { type: 'user', id: 'another-user-id' }
            }
          ]
        },
        {
          actors: {
            'another-actor-id': { type: 'user', id: 'another-actor-id' }
          },
          activities: [
            {
              actor: { type: 'user', id: 'another-actor-id' },
              object: { type: 'post', id: '2nd-article-id' },
              target: { type: 'user', id: '3rd-user-id' },
              origin: { type: 'user', id: 'another-user-id' }
            }
          ]
        }
      ],
      extra: {
        user: {
          'an-actor-id': { _id: 'an-actor-id' },
          'a-user-id': { _id: 'a-user-id' },
          'another-user-id': { _id: 'another-user-id' },
          'another-actor-id': { _id: 'another-actor-id' },
          '3rd-user-id': { _id: '3rd-user-id' }
        },
        post: {
          'an-article-id': { _id: 'an-article-id' },
          '2nd-article-id': { _id: '2nd-article-id' }
        }
      }
    })
    expect(findUser).toBeCalledWith({
      _id: {
        $in: [
          'another-user-id',
          'an-actor-id',
          'a-user-id',
          'another-actor-id',
          '3rd-user-id'
        ]
      }
    })
    expect(findPost).toBeCalledWith({
      _id: { $in: ['an-article-id', '2nd-article-id'] }
    })
  })
})
