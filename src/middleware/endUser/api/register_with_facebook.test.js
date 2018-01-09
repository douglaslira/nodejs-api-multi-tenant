'use strict'

jest.mock('uuid/v1')
import uuid from 'uuid/v1'
uuid.mockImplementation(() => 'abcde12345')

import {
  createUserFromFacebookInfo,
  createUniqueUsername,
  registerNewAccountFromFacebook,
  joinExistingAccountWithFacebookInfo
} from './register_with_facebook'

describe('facebook registration', () => {
  describe('creates unique username', () => {
    let findByUsername = jest.fn()
    let User = { findByUsername }

    it('uses email prefix unmodified as first choice (if available)', async () => {
      findByUsername.mockReturnValueOnce(undefined)
      const result = await createUniqueUsername(User, {
        email: 'steveliles@gmail.com'
      })
      expect(result).toBe('steveliles')
    })

    it('uses "name" flattened as 2nd choice (if available)', async () => {
      findByUsername.mockReturnValueOnce({ email: 'steveliles' }) // steveliles is taken!
      findByUsername.mockReturnValueOnce(undefined)
      const result = await createUniqueUsername(User, {
        email: 'steveliles@gmail.com',
        name: 'Steven Liles'
      })
      expect(result).toBe('stevenliles')
    })

    it('uses "name" flattened + part of facebook id as 3rd choice (if available)', async () => {
      findByUsername.mockReturnValueOnce({ username: 'steveliles' }) // steveliles is taken!
      findByUsername.mockReturnValueOnce({ username: 'stevenliles' })
      findByUsername.mockReturnValueOnce(undefined)
      const result = await createUniqueUsername(User, {
        email: 'steveliles@gmail.com',
        name: 'Steven Liles',
        userID: 'blahblah123'
      })
      expect(result).toBe('stevenliles123')
    })

    it('uses "name" flattened + part of facebook id as 3rd choice (if available)', async () => {
      findByUsername.mockReturnValueOnce({ username: 'steveliles' }) // steveliles is taken!
      findByUsername.mockReturnValueOnce({ username: 'stevenliles' })
      findByUsername.mockReturnValueOnce(undefined)
      const result = await createUniqueUsername(User, {
        email: 'steveliles@gmail.com',
        name: 'Steven Liles',
        userID: 'blahblah123'
      })
      expect(result).toBe('stevenliles123')
    })

    it('uses "name" flattened + entire facebook id as 4th choice (if available)', async () => {
      findByUsername.mockReturnValueOnce({ username: 'steveliles' }) // steveliles is taken!
      findByUsername.mockReturnValueOnce({ username: 'stevenliles' })
      findByUsername.mockReturnValueOnce({ username: 'stevenliles123' })
      const result = await createUniqueUsername(User, {
        email: 'steveliles@gmail.com',
        name: 'Steven Liles',
        userID: 'blahblah123'
      })
      expect(result).toBe('stevenlilesblahblah123')
    })

    it('uses random username if all else fails', async () => {
      findByUsername.mockReturnValueOnce({ username: 'steveliles' }) // steveliles is taken!
      findByUsername.mockReturnValueOnce({ username: 'stevenliles' })
      findByUsername.mockReturnValueOnce({ username: 'stevenliles123' })
      findByUsername.mockReturnValueOnce({ username: 'stevenlilesblahblah123' })

      const result = await createUniqueUsername(User, {
        email: 'steveliles@gmail.com',
        name: 'Steven Liles',
        userID: 'blahblah123'
      })
      expect(result).toBe('abcde12345')
    })
  })

  describe('translates fb-user to ns-user', () => {
    it('mapping fields appropriately', async () => {
      const user = await createUserFromFacebookInfo({
        name: 'Steve Liles',
        first_name: 'Steve',
        last_name: 'Liles',
        gender: 'male',
        locale: 'en_GB',
        email: 'steveliles@gmail.com',
        picture: {
          data: {
            is_silhouette: true,
            url: 'https://url-to-useless-avatar'
          }
        },
        userID: '820543830175781',
        tags: ['tag01', 'tag02']
      })
      expect(user).toEqual({
        firstname: 'Steve',
        lastname: 'Liles',
        email: 'steveliles@gmail.com',
        gender: 'male',
        locale: {
          value: 'en_GB',
          language: 'en',
          region: 'GB'
        },
        initial_tags: ['tag01', 'tag02'],
        facebookUserId: '820543830175781'
      })
    })

    it('handles no tags appropriately', async () => {
      const tags = []
      for (let i = 1; i <= 15; i++) tags.push(`tag_${i}`)
      const user = await createUserFromFacebookInfo({
        name: 'Steve Liles',
        first_name: 'Steve',
        last_name: 'Liles',
        gender: 'male',
        locale: 'en_GB',
        email: 'steveliles@gmail.com',
        picture: {
          data: {
            is_silhouette: true,
            url: 'https://url-to-useless-avatar'
          }
        },
        userID: '820543830175781'
      })
      expect(user).toEqual({
        firstname: 'Steve',
        lastname: 'Liles',
        email: 'steveliles@gmail.com',
        gender: 'male',
        locale: {
          value: 'en_GB',
          language: 'en',
          region: 'GB'
        },
        initial_tags: [],
        facebookUserId: '820543830175781'
      })
    })

    it('ignores useless silhouette picture', async () => {
      const user = await createUserFromFacebookInfo({
        name: 'Steve Liles',
        first_name: 'Steve',
        last_name: 'Liles',
        gender: 'male',
        locale: 'en_GB',
        email: 'steveliles@gmail.com',
        picture: {
          data: {
            is_silhouette: true,
            url: 'https://url-to-useless-avatar'
          }
        },
        userID: '820543830175781'
      })
      expect(user.avatar).toBeUndefined()
    })

    it('captures and uploads useful picture as avatar', async () => {
      let filestore = {
        copyFromURL: jest.fn().mockImplementation((url, filename) => ({
          uuid: 'abc123',
          originalFileName: filename,
          originalFileSize: 123,
          contentType: 'image/jpg'
        }))
      }
      const user = await createUserFromFacebookInfo(
        {
          name: 'Steve Liles',
          first_name: 'Steve',
          last_name: 'Liles',
          gender: 'male',
          locale: 'en_GB',
          email: 'steveliles@gmail.com',
          picture: {
            data: {
              is_silhouette: false,
              url: 'https://url-to-good-avatar.jpg?oh=12ca34v3v23'
            }
          },
          userID: '820543830175781'
        },
        filestore
      )
      expect(user.avatar).toEqual({
        uuid: 'abc123',
        originalFileName: 'fb-avatar.jpg',
        originalFileSize: 123,
        contentType: 'image/jpg'
      })
    })
  })
})
