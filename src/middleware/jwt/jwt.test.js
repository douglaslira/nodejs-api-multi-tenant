'use strict'

import { encoder, decoder } from './jwt'

test('encoder creates a jwt encoder that can be reused', () => {
  const encode = encoder({
    secret: 'my-little-secret',
    expireInSeconds: 60 * 60 * 24 * 365 * 100,
    time: () => 1499702179
  })
  expect(
    encode({
      foo: 'bar',
      whiz: 'bang'
    })
  ).toBe(
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ2NTMzMDIxNzksImZvbyI6ImJhciIsIndoaXoiOiJiYW5nIn0.jKX0kwFPcXzQczhKY5NudXI8tSbDDDVSljFVX5GwofQ'
  )
  expect(
    encode({
      steve: 'liles',
      mark: 'martires'
    })
  ).toBe(
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ2NTMzMDIxNzksInN0ZXZlIjoibGlsZXMiLCJtYXJrIjoibWFydGlyZXMifQ.KfS-BSKnFR87tJrb0eu43CaaTfE0DG6MOXU5Uic71NI'
  )
})

test('decoder creates a jwt decoder that can be reused', () => {
  const decode = decoder({
    secret: 'my-little-secret'
  })
  expect(
    decode(
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ2NTMzMDIxNzksImZvbyI6ImJhciIsIndoaXoiOiJiYW5nIn0.jKX0kwFPcXzQczhKY5NudXI8tSbDDDVSljFVX5GwofQ'
    )
  ).toEqual({
    exp: 4653302179,
    foo: 'bar',
    whiz: 'bang'
  })
  expect(
    decode(
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ2NTMzMDIxNzksInN0ZXZlIjoibGlsZXMiLCJtYXJrIjoibWFydGlyZXMifQ.KfS-BSKnFR87tJrb0eu43CaaTfE0DG6MOXU5Uic71NI'
    )
  ).toEqual({
    exp: 4653302179,
    steve: 'liles',
    mark: 'martires'
  })
})
