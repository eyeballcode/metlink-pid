import { SerialPort } from 'serialport'

/**
 * The `PageAnimate` class holds constants
    for types of entry animations available to `Pages <Page>`.

    Each constant has a string value
    which is used when converting `Page` objects to & from strings.

    The documentation for each constant
    describes each available animation and any relevant considerations.
 */
export class PageAnimate {
  /**
   * Appear instantly.
    
    Text not fitting on the display is clipped and never seen.
    
    Page delay commences immediately.
   */
  static NONE = new PageAnimate('N')

  /**
   * Scroll vertically into view from the bottom,
    and remain on the display.
    
    Text not fitting on the display is clipped and never seen.
    
    Page delay commences as soon as the text is fully displayed.
   */
  static VSCROLL = new PageAnimate('V')

  /**
   * Scroll horizontally into view from the right,
    simultaneously scrolling the previous page out of view to the left,
    then scroll out of view to the left.
    
    Page delay commences after all scrolling text becomes fully invisible,
    so usually a delay of ``0`` is desired in conjunction with `HSCROLL`.
   */
  static HSCROLL = new PageAnimate('H')

  #animate

  constructor(type) {
    this.#animate = type.toUpperCase()
  }

  toString() {
    return this.#animate
  }
}

export class Page {

  #animate
  #delay
  #text

  /** A mapping from permissible ASCII/Unicode characters
  to the equivalent display-level byte. */
  static _TEXT_ENCODING = {
    ...(" !#$&'()*+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZ\\abcdefghijklmnopqrstuvwxyz".split('').reduce((acc, e) => {
      acc[e] = e.charCodeAt(0)
      return acc
    }, {})),
    '\u00B7': 0x8F,  // MIDDLE DOT
    '\u2022': 0xD3,  // BULLET
    '\u2500': 0x97,  // BOX DRAWINGS LIGHT HORIZONTAL
    '\u2501': 0xD2,  // BOX DRAWINGS HEAVY HORIZONTAL
    '\u2588': 0x5F,  // FULL BLOCK
    '\u2594': 0xA3,  // UPPER ONE EIGHTH BLOCK
  }

  /**
   * A mapping from display-level bytes
    to the equivalent ASCII/Unicode character.
    
    In some cases, multiple display-level bytes map to a common ASCII/Unicode character:
    
    *   Bytes ``"`` and ``'`` map to character ``'``
        (which means ``"`` can't be permitted as an input character).
    *   Bytes ``\xA3``, ``\xA4``, and ``\xA5`` map to character ``▔``.
    
    Although not problematic,
    this makes perfect round-tripping between characters and display bytes impossible,
    so it should never be assumed to be possible.
   */
  static _TEXT_DECODING = {
    ...(Object.keys(Page._TEXT_ENCODING).reduce((acc, e) => {
      acc[Page._TEXT_ENCODING[e]] = e
      return acc
    }, {})),
    0x98: '\u2500',
    0xA4: '\u2594',
    0xA5: '\u2594',
  }

  static _ATTRS_SEP = '^'
  static _RIGHT_CHAR_DECODED = '~'
  static _RIGHT_CHAR_ENCODED = '\\R'
  static _NEWLINE_CHAR = '_'
  static _NEWLINE_BYTESEQ = 0x0A
  static _STR_RE = /^(?:(?<animate>[A-Za-z]?)(?<delay>\d*)\^)?(?<text>.*)$/s

  static _ANIMATE_ENCODING = {
    [PageAnimate.NONE]: 0x00,
    [PageAnimate.VSCROLL]: 0x1D,
    [PageAnimate.HSCROLL]: 0x2F
  }

  static _ANIMATE_DECODING = {
    ...(Object.keys(Page._ANIMATE_ENCODING).reduce((acc, e) => {
      acc[Page._ANIMATE_ENCODING[e]] = e
      return acc
    }, {}))
  }

  /**
   A :`Page` object represents one "screen" of information in a `DisplayMessage`.

    Each `Page` object holds the text to be displayed,
    how the text animates on entry,
    and how long the page should "pause"
    between completion of the animation and display of the next page.

    `Page` objects are not typically constructed directly.
    Instead, they usually come to exist through construction of `DisplayMessage` objects.

    @param {PageAnimate} animate the type of animation to take place on page entry, given as a `PageAnimate` constant.

    @param {int} delay the length of time (in approximately quarter-seconds) to delay display of the next page after animation completes, given as an `int` between ``0`` and ``255`` inclusive.

    @param {string} text the text to display on the page. All ASCII letters & numbers, the ASCII space character, and these other printable ASCII characters can be used freely:
               ```
            (+)     (0)(1)(2)(3)(4)(5)(6)(7)(8)(9)(A)(B)(C)(D)(E)(F)

            (0x20)      !     #  $     &  '  (  )  *  +  ,  -  .  /
            (0x30)                                 :  ;  <  =  >  ?
            (0x50)                                       \\
            ```

        as well as some Unicode characters::
```
            (+)       (0)(1)(2)(3)(4)(5)(6)(7)(8)(9)(A)(B)(C)(D)(E)(F)

            (0x00B0)                        ·
            (0x2020)         •
            (0x2500)   ─  ━
            (0x2580)                           █
            (0x2590)               ▔
            ```
        Notably, some printable ASCII characters **cannot** be used::
               ```
            (+)     (0)(1)(2)(3)(4)(5)(6)(7)(8)(9)(A)(B)(C)(D)(E)(F)

            (0x20)         "        %
            (0x40)   @
            (0x50)                                    [     ]  ^  _
            (0x60)   `
            (0x70)                                    {  |  }  ~  
            ```

        Some of these unusable characters are instead utilised for other purposes:

        *   Use ``~`` to right-justify the remaining text on the line.
        *   Use ``_`` to advance to the next line of the display.

        A few more of these characters
        are utilised by the various `Page` & `DisplayMessage` string methods
        to enable compact, easily-typed, pure-string representations containing all attributes.

    :raise ValueError:
        if the text contains unusable characters,
        or if a valid `PageAnimate` value is not given,
        or if the delay is outside the permissible range.
    """
   */
  constructor(animate, delay, text) {
    this.#animate = animate
    this.#delay = delay
    this.#text = text
  }

  getAnimate() { return this.#animate }
  getDelay() { return this.#delay }
  getText() { return this.#text }

  /**
  Construct a `Page` object from a string representation.

  @param {string} string a string in one of the following formats:
      -   ``<text>``
      -   ``^<text>``
      -   ``<animate>^<text>``
      -   ``<delay>^<text>``
      -   ``<animate><delay>^<text>``

      where:

      -   ``<animate>`` is the string value of the desired `PageAnimate` value
          (e.g. ``N`` for `PageAnimate.NONE`);
      -   ``<delay>`` is the desired ``delay`` value; and
      -   ``<text>`` is the desired ``text`` value.

      For reference, such a string can also be obtained
      by converting an existing `Page` object to a string using the .toString() method:

      > new Page(PageAnimate.VSCROLL, 40, '12:34 FUNKYTOWN\~5_Limited Express').toString()
      'V40^12:34 FUNKYTOWN\~5_Limited Express'

  @param {string} [default_animate=PageAnimate.NONE] the ``animate`` value to use if one is not provided in the string. Defaults to `PageAnimate.NONE`.

  @param {number} [default_delay=20] the ``delay`` value to use if one is not provided in the string. Defaults to ``20``.

  :raise ValueError:
      if the text contains unusable characters,
      or if a valid `PageAnimate` value is not given,
      or if the delay is outside the permissible range. */
  static fromStr(string, default_animate = PageAnimate.NONE, default_delay = 20) {
    let match = string.match(this._STR_RE)
    let animate = default_animate
    let delay = default_delay

    if (match.groups.animate) animate = new PageAnimate(match.groups.animate)
    if (match.groups.delay) delay = parseInt(match.groups.delay)

    return new Page(animate, delay, match.groups.text)

  }

  /**
    Gets The string representation of this object.

    @returns {string} A string, that when passed to `Page.from_str` will yield an equivalent `Page` object to this one.
   */
  toString() {
    return this.#animate.toString() + this.#delay + Page._ATTRS_SEP + this.#text
  }

  /**
    The raw byte representation of the `Page` as understood by the display.

    Used by `DisplayMessage.toBytes`
    when preparing to `PID.send()` a complete `DisplayMessage` to the display.
   */
  toBytes() {
    let animateByte = Page._ANIMATE_ENCODING[this.#animate.toString()]
    let offsetByte = this.#text.match(/^(_+)/)?.[0].length || 0
    let delayByte = this.#delay
    let textBytes = this.#text.slice(offsetByte).split(Page._NEWLINE_CHAR)
      .map(line => Page.encodeText(line.replace(Page._RIGHT_CHAR_DECODED, Page._RIGHT_CHAR_ENCODED)))
      .reduce((acc, e) => [...acc, 0x0A, ...e] ,[]).slice(1)

    return Buffer.from([
      animateByte,
      offsetByte,
      delayByte,
      0x00,
      ...textBytes
    ])
  }

  /**
   Convert a string of characters into a string of display-level bytes. Called from the :meth:`to_bytes` method.
   * @param {string} text The string for display
   */
  static encodeText(text) {
    let bytesOut = Array(text.length)
    let badChars = new Set()

    for (let i = 0; i < text.length; i++) {
      let char = text[i]
      if (char in Page._TEXT_ENCODING) {
        bytesOut[i] = Page._TEXT_ENCODING[char]
      } else {
        badChars.add(char)
      }
    }

    if (badChars.length > 0) throw new RangeError(`${badChars.entries().join(', ')} not in allowed characters`)
    return bytesOut
  }

}