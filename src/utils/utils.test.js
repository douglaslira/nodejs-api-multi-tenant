'use strict'

import {
  emailOriginCreator,
  rootDomainExtractor,
  assignWithoutOverwrite
} from './utils'

describe('rootDomainExtractor', () => {
  it('should extract root domain from sub-domain', () => {
    expect(rootDomainExtractor('test.mushtarek.org')).toBe('mushtarek.org')
  })
  it('should return root domain when given root domain', () => {
    expect(rootDomainExtractor('mushtarek.org')).toBe('mushtarek.org')
  })
  it('should throw if domain is undefined', () => {
    try {
      rootDomainExtractor(undefined)
      throw new Error('should not reach here!')
    } catch (e) {
      expect(e.message).toBe("invalid domain 'undefined'")
    }
  })
  it('should throw if domain is empty string', () => {
    try {
      rootDomainExtractor('')
      throw new Error('should not reach here!')
    } catch (e) {
      expect(e.message).toBe("invalid domain ''")
    }
  })
  it('should throw if domain is invalid', () => {
    try {
      rootDomainExtractor('i can whistle, can you?')
      throw new Error('should not reach here!')
    } catch (e) {
      expect(e.message).toBe("invalid domain 'i can whistle, can you?'")
    }
  })
})

describe('emailOriginCreator', () => {
  it('should return a compose no reply email address when no prefix is provided', () => {
    expect(emailOriginCreator('test.mushtarek.org')).toBe(
      'test.mushtarek.org <no-reply@mushtarek.org>'
    )
  })
  it('should use prefix if provided', () => {
    expect(emailOriginCreator('test.mushtarek.org', 'joe')).toBe(
      'test.mushtarek.org <joe@mushtarek.org>'
    )
  })
})

describe('assignWithoutOverwrite', () => {
  it('gives precedence to left-most parameter', () => {
    expect(assignWithoutOverwrite({ foo: 'yes' }, { foo: 'no' })).toEqual({
      foo: 'yes'
    })
  })
  it('combines properties of both parameters', () => {
    expect(assignWithoutOverwrite({ eyes: 'two' }, { nose: 'one' })).toEqual({
      eyes: 'two',
      nose: 'one'
    })
  })
  it('replaces null or undefined properties of left-most parameter', () => {
    const left = { eyes: 'two', feet: undefined, hands: null }
    const right = {
      nose: 'one',
      feet: 'yes',
      hands: 'probably',
      eyes: undefined
    }
    expect(assignWithoutOverwrite(left, right)).toEqual({
      eyes: 'two',
      nose: 'one',
      feet: 'yes',
      hands: 'probably'
    })
  })
})
