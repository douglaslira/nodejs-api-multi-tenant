import {
  mapByThread,
  threadMapToConversation,
  toConversations
} from './PostFactory'

describe('threadMapToConversation', () => {
  it('flattens thread map to conversation (array of arrays)', () => {
    expect(
      threadMapToConversation({
        '2': {
          _id: '2',
          responses: {
            '2b': {
              _id: '2b',
              responses: {
                '2b1': {
                  _id: '2b1',
                  responses: {}
                }
              }
            }
          }
        }
      })
    ).toEqual([
      {
        _id: '2',
        responses: [
          {
            _id: '2b',
            responses: [
              {
                _id: '2b1',
                responses: []
              }
            ]
          }
        ]
      }
    ])
  })
})

describe('toConversation', () => {
  it('creates a map keyed by each entry in each reponses thread', () => {
    expect(
      toConversations([{ _id: '2b1', thread: ['root', '2', '2b'] }])
    ).toEqual([
      {
        _id: '2',
        responses: [
          {
            _id: '2b',
            responses: [
              {
                _id: '2b1',
                thread: ['root', '2', '2b'],
                responses: []
              }
            ]
          }
        ]
      }
    ])
  })
  it('handles flat lists', () => {
    const input = [
      { _id: '1', thread: ['root'] },
      { _id: '2', thread: ['root'] },
      { _id: '3', thread: ['root'] }
    ]
    const expected = [
      {
        _id: '1',
        thread: ['root'],
        responses: []
      },
      {
        _id: '2',
        thread: ['root'],
        responses: []
      },
      {
        _id: '3',
        thread: ['root'],
        responses: []
      }
    ]
    expect(toConversations(input)).toEqual(expected)
  })
  it('handles deeply nested threads', () => {
    const input = [
      { _id: '1', thread: ['root'] },
      { _id: '1a', thread: ['root', '1'] },
      { _id: '1b', thread: ['root', '1'] },
      { _id: '2', thread: ['root'] },
      { _id: '2a', thread: ['root', '2'] },
      { _id: '2b', thread: ['root', '2'] },
      { _id: '2b1', thread: ['root', '2', '2b'] }
    ]
    const expected = [
      {
        _id: '1',
        thread: ['root'],
        responses: [
          {
            _id: '1a',
            thread: ['root', '1'],
            responses: []
          },
          {
            _id: '1b',
            thread: ['root', '1'],
            responses: []
          }
        ]
      },
      {
        _id: '2',
        thread: ['root'],
        responses: [
          {
            _id: '2a',
            thread: ['root', '2'],
            responses: []
          },
          {
            _id: '2b',
            thread: ['root', '2'],
            responses: [
              {
                _id: '2b1',
                thread: ['root', '2', '2b'],
                responses: []
              }
            ]
          }
        ]
      }
    ]
    expect(toConversations(input)).toEqual(expected)
  })
})
