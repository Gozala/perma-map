import { bitCount, popcount as popcount32 } from "./bitfield-uint32.js"
import * as API from "./api.js"

/**
 * @param {number} size
 * @returns {API.BitField<Uint8Array>}
 */
export const configure = size => {
  if (size % 8 !== 0) {
    throw new Error(`Must be multiple of 8`)
  }

  return {
    create: () => create(size),
    set,
    unset,
    get,
    toBytes,
    fromBytes,
    popcount,
    and,
    or,
  }
}

/**
 * @param {number} size
 */
export const create = size => {
  if (size % 8 !== 0) {
    throw new Error(`Must be multiple of 8`)
  }

  return new Uint8Array(size / 8)
}

/**
 * Set a particular bit.
 *
 * @param {Uint8Array} bitfield
 * @param {number} index
 * @returns {Uint8Array}
 */
export const set = (bitfield, index) => {
  const byteOffset = (index / 8) | 0
  const bitOffset = index % 8
  if ((bitfield[byteOffset] & (1 << bitOffset)) === 0) {
    const result = bitfield.slice()
    result[byteOffset] |= 1 << bitOffset
    return result
  } else {
    return bitfield
  }
}

/**
 * Unsets a particular bit.

 * @param {Uint8Array} bitfield
 * @param {number} index
 * @returns {Uint8Array}
 */
export const unset = (bitfield, index) => {
  const byteOffset = (index / 8) | 0
  const bitOffset = index % 8
  if ((bitfield[byteOffset] & (1 << bitOffset)) !== 0) {
    const result = bitfield.slice()
    result[byteOffset] |= ~(1 << bitOffset)
    return result
  } else {
    return bitfield
  }
}

/**
 * Returns `true` if bit at given index is set.
 *
 * @param {Uint8Array} bitfield
 * @param {number} index
 */
export const get = (bitfield, index) => {
  var byteOffset = (index / 8) | 0
  var bitOffset = index % 8
  return (bitfield[byteOffset] & (1 << bitOffset)) !== 0
}

/**
 * @param {Uint8Array} bitfield
 */
export const toBytes = bitfield => bitfield

/**
 * @param {Uint8Array} bytes
 */
export const fromBytes = bytes => bytes

/**
 * @param {Uint8Array} bitfield
 * @param {number} index
 */
export const popcount = (bitfield, index = bitfield.byteLength * 8) => {
  const byteOffset = (index / 8) | 0
  const bitOffset = index % 8

  let count = popcount32(bitfield[byteOffset], bitOffset)
  let offset = 0
  while (offset < byteOffset) {
    const byte = bitfield[offset]
    count += bitCount(byte)
    offset++
  }

  return count
}

/**
 * @param {Uint8Array} left
 * @param {Uint8Array} right
 */
export const or = (left, right) => {
  const result = left.slice()
  let offset = 0
  while (offset < left.length) {
    result[offset] |= right[offset]
    offset++
  }
  return result
}

/**
 * @param {Uint8Array} left
 * @param {Uint8Array} right
 */
export const and = (left, right) => {
  const result = left.slice()
  let offset = 0
  while (offset < left.length) {
    result[offset] &= right[offset]
    offset++
  }
  return result
}

export { API }
