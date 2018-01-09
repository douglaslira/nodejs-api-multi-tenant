'use strict'

import { getLocale } from './locale'

test('extracts locale info from context', () => {
  const ctx = {
    acceptsLanguages: jest.fn().mockReturnValue(['en-GB', 'ar'])
  }
  getLocale(ctx)
  expect(ctx.acceptsLanguages).toBeCalled()
})

test('creates a locale object from locale string', () => {
  const ctx = {
    acceptsLanguages: jest.fn().mockReturnValue(['en-GB', 'ar'])
  }
  const result = getLocale(ctx)
  expect(result).toEqual({
    value: 'en-GB',
    language: 'en',
    region: 'GB'
  })
})

test('can extract all locale objects from locales array', () => {
  const ctx = {
    acceptsLanguages: jest.fn().mockReturnValue(['en-GB', 'ar'])
  }
  const result = getLocale(ctx, true)
  expect(result).toEqual([
    {
      value: 'en-GB',
      language: 'en',
      region: 'GB'
    },
    {
      value: 'ar',
      language: 'ar'
    }
  ])
})

test('prefers user locale if available', () => {
  const ctx = {
    acceptsLanguages: jest.fn().mockReturnValue(['en-GB', 'ar']),
    state: {
      user: {
        locale: {
          value: 'fr-FR',
          language: 'fr',
          region: 'FR'
        }
      }
    }
  }
  const result = getLocale(ctx)
  expect(result).toEqual({
    value: 'fr-FR',
    language: 'fr',
    region: 'FR'
  })
})

test('prioritises user locale over headers when multi', () => {
  const ctx = {
    acceptsLanguages: jest.fn().mockReturnValue(['en-GB', 'ar']),
    state: {
      user: {
        locale: {
          value: 'fr-FR',
          language: 'fr',
          region: 'FR'
        }
      }
    }
  }
  const result = getLocale(ctx, true)
  expect(result).toEqual([
    {
      value: 'fr-FR',
      language: 'fr',
      region: 'FR'
    },
    {
      value: 'en-GB',
      language: 'en',
      region: 'GB'
    },
    {
      value: 'ar',
      language: 'ar'
    }
  ])
})
