import * as API from "./api.js"

export { API }

/**
 * @param {API.Uint32} size
 */
export const empty = (size = 32) => {
  // We could support < 32, but it seems impractical and would negatively affect
  // performance as we would have to do extra bound checks.
  if (size !== 32) {
    throw new Error(`Uint32 BitField does not support size: ${size}`)
  }

  return 0
}

/**
 * @param  {API.Uint32[]} bits
 * @param {API.Uint32} [size]
 */
export const from = (bits, size) => {
  let bitfield = empty(size)
  for (const bit of bits) {
    bitfield = set(bitfield, bit)
  }
  return bitfield
}

/**
 * @param {API.Uint32} _bitField
 */
export const size = _bitField => 32

/**
 * Reads out 5 bits at the given bit offset.
 *
 * @param {API.Uint32} bitField - Bitfield in Uint32 representation.
 * @param {API.Uint32} index - Index with-in `bitField` to read bits from.
 * @returns {API.Uint32}
 */
const mask = (bitField, index) => (bitField >>> index) & 0b11111

/**
 * Creates mask that can be used to check a bit in nodes bitmap for the give
 * key (hash) at given depth.
 *
 * @param {API.Uint32} bitField - Key hash as 32 bit integer.
 * @param {API.Uint32} index - Index with-in the 32bit bitfield
 */
const offset = (bitField, index) => 1 << mask(bitField, index)

/**
 * Maps numbers [0, 31] to powers of two. Creates mask that can be used
 * to check a bit in nodes bitmap for the give key (hash) at given depth.
 *
 * @param {API.Uint32} bitField - Key hash as 32 bit integer.
 * @param {API.Uint32} index - Index with-in the 32bit bitfield
 */
export const popcount = (bitField, index = 31) =>
  bitCount(bitField & (offset(index, 0) - 1))

/**
 * @param {API.Uint32} bitField
 * @param {API.Uint32} index
 */
export const set = (bitField, index) => bitField | (1 << index)

/**
 * @param {API.Uint32} bitField
 * @param {API.Uint32} index
 */
export const unset = (bitField, index) => bitField & (0xff ^ (1 << index))

/**
 * @param {API.Uint32} bitField
 * @param {API.Uint32} index
 */
export const get = (bitField, index) => ((bitField >> index) & 0x1) !== 0

/**
 * Counts the number of bits set in n
 * @param {API.Uint32} bitField
 */
export const bitCount = bitField => {
  const n1 = bitField - ((bitField >> 1) & 0x55555555)
  const n2 = (n1 & 0x33333333) + ((n1 >> 2) & 0x33333333)
  const n3 = ((n2 + (n2 >> 4)) & 0xf0f0f0f) * 0x1010101
  return n3 >> 24
}

/**
 * @param {API.Uint32} left
 * @param {API.Uint32} right
 * @returns {API.Uint32}
 */
export const and = (left, right) => left & right

/**
 * @param {API.Uint32} left
 * @param {API.Uint32} right
 * @returns {API.Uint32}
 */
export const or = (left, right) => left | right

/**
 * Counts the number of bits set in n
 * @param {API.Uint32} bitField
 * @returns {Uint8Array}
 */
export const toBytes = bitField =>
  Uint8Array.of(
    (bitField >> 24) & 0b1111_1111,
    (bitField >> 16) & 0b1111_1111,
    (bitField >> 8) & 0b1111_1111,
    bitField & 0b1111_1111
  )

/**
 *
 * @param {Uint8Array} bytes
 * @returns {API.Uint32}
 */
export const fromBytes = bytes => {
  if (bytes.length !== 4) {
    throw new Error(`Expected 4 bytes instead got ${bytes.length}`)
  }
  return (bytes[0] << 24) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]
}
