import { hash, generatePassword } from './passwords'

describe('hash', () => {
  it('creates a sha256 hash encoded as a hex string', () => {
    expect(hash('steve')).toBe(
      'f148389d080cfe85952998a8a367e2f7eaf35f2d72d2599a5b0412fe4094d65c'
    )
    expect(hash('markbame')).toBe(
      'c2b41b77e00c7aaf0f13f781ace14df6d0428d8636b95cdb32b080459a54480a'
    )
  })

  it('creates a salted sha256 hash encoded as a hex string', () => {
    expect(hash('steve', 'sea-salt')).toBe(
      '1c9b661c635eb7eb80ef21177ea0478cc146bf8813dab42719277b0f4bb4fbc5'
    )
    expect(hash('markbame', 'table-salt')).toBe(
      'f21ca46889fce9f28d8742a9226257eb058c7ed8dcb22e7897bc0f1da01b0564'
    )
  })
})

describe('generatePassword', () => {
  it('creates a decently random looking salted password', () => {
    expect(generatePassword('steveliles@gmail.com', 'rock-salt')).toBe(
      '5c5600e51a'
    )
  })
})
