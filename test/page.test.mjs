import { Page, PageAnimate } from '../index.mjs'
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

  describe('The input string regex', () => {
    it('Matches strings with all fields', () => {
      let data = 'H40^hello'.match(Page._STR_RE).groups
      expect(data.animate).to.equal('H')
      expect(data.delay).to.equal('40')
      expect(data.text).to.equal('hello')
    })

    it('Matches strings without an animation', () => {
      let data = 'hello'.match(Page._STR_RE).groups
      expect(data.animate).to.equal(undefined)
      expect(data.delay).to.equal(undefined)
      expect(data.text).to.equal('hello')
    })

    it('Matches strings with only a delay', () => {
      let data = 'V^hello'.match(Page._STR_RE).groups
      expect(data.animate).to.equal('V')
      expect(data.delay).to.equal('')
      expect(data.text).to.equal('hello')
    })
  })

  describe('The fromStr method', () => {
    it('Should parse the input string and set the values accordingly', () => {
      let page = Page.fromStr('V^12:34')
      expect(page.getAnimate().toString()).to.equal(PageAnimate.VSCROLL.toString())
      expect(page.getDelay()).to.equal(20)
      expect(page.getText()).to.equal('12:34')
    })

    it('Should parse the input string with a delay but no animation type', () => {
      let page = Page.fromStr('40^test')
      expect(page.getAnimate().toString()).to.equal(PageAnimate.NONE.toString())
      expect(page.getDelay()).to.equal(40)
      expect(page.getText()).to.equal('test')
    })
  })
  
  describe('The toString method', () => {
    it('Should return a string representing the Page', () => {
      let page = new Page(PageAnimate.VSCROLL, 40, '12:34 FUNKYTOWN~5_Limited Express')
      expect(page.toString()).to.equal('V40^12:34 FUNKYTOWN~5_Limited Express')
    })
  })

  describe('The toBytes method', () => {
    it('Should convert the page attributes into byte data', () => {
      let expected = [
        0x1D, // animate byte
        0x01, // offset byte
        35, // delay byte
        0x00,
        0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64 // Text data
      ]
      let page = Page.fromStr('V35^_Hello World')
      expect([ ...page.toBytes() ]).to.deep.equal(expected)
    })
  })

  describe('The encodeText method', () => {
    it('Should convert an ASCII string to its ASCII values', () => {
      let expected = [ 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64 ]
      expect(Page.encodeText('Hello World')).to.deep.equal(expected)
    })

    it('Should convert unicode characters to their encoded values', () => {
      let expected = [0x54, 0x65, 0x73, 0x74, 0xD2 ]
      expect(Page.encodeText('Test━')).to.deep.equal(expected)
    })
  })
})