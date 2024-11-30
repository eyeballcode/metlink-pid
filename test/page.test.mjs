import { Page } from '../index.mjs'
import { expect } from 'chai'

describe('The Page constants', () => {
  describe('The text encoding mapping', () => {
    it('Should map ASCII characters to themselves', () => {
      expect(Page._TEXT_ENCODING['A']).to.equal('A'.charCodeAt(0))
      expect(Page._TEXT_ENCODING['Z']).to.equal('Z'.charCodeAt(0))
      expect(Page._TEXT_ENCODING['\\']).to.equal('\\'.charCodeAt(0))
    })

    it('Should map special unicode characters to their expected values', () => {
      expect(Page._TEXT_ENCODING['█']).to.equal(0x5F)
      expect(Page._TEXT_ENCODING['•']).to.equal(0xD3)
    })
  })

  describe('The text decoding mapping', () => {
    it('Should map ASCII character values to the character', () => {
      expect(Page._TEXT_DECODING['A'.charCodeAt(0)]).to.equal('A')
      expect(Page._TEXT_DECODING['!'.charCodeAt(0)]).to.equal('!')
      expect(Page._TEXT_DECODING[')'.charCodeAt(0)]).to.equal(')')
    })

    it('Should map special unicode character values to the character', () => {
      expect(Page._TEXT_DECODING[0x5F]).to.equal('█')
      expect(Page._TEXT_DECODING[0x97]).to.equal('─')
    })

    it('Should map non symmetric unicode character values to the character', () => {
      expect(Page._TEXT_DECODING[0xA4]).to.equal('▔')
      expect(Page._TEXT_DECODING[0x98]).to.equal('─')
    })
  })
})