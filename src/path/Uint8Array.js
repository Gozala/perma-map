import * as API from "./api.js"
const utf8 = new TextEncoder()
import { murmur364 } from "@multiformats/murmur3"

/**
 * @param {Uint8Array} bytes
 */
/* c8 ignore next 2 */
export const hash64 = bytes =>
  /** @type {Uint8Array} */ (murmur364.encode(bytes))

/**
 * @param {Partial<API.Options<Uint8Array>>} options
 * @returns {API.Path<Uint8Array>}
 */
/* c8 ignore next 25 */
export const configure = ({ bitWidth = 8, hash = hash64 } = {}) => {
  const hashSize = hash(new Uint8Array()).byteLength

  /**
   * @param {Uint8Array} path
   * @param {number} depth
   * @returns {API.Uint32}
   */
  const at = (path, depth) => {
    const offset = depth * bitWidth
    if (offset > hashSize) {
      throw new RangeError(`Out of bounds`)
    }

    return toInt(path, offset, bitWidth)
  }

  /**
   * @param {string} key
   * @returns {Uint8Array}
   */
  const from = key => hash(utf8.encode(key))

  return { from, at, size: Math.ceil((hashSize * 8) / bitWidth) }
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset - bit offset
 * @param {number} count - number of bits to consume
 */
export const toInt = (bytes, offset, count) => {
  let byteOffset = (offset / 8) | 0
  let bitOffset = offset % 8
  let desired = count
  let bits = 0
  while (desired > 0 && byteOffset < bytes.byteLength) {
    const byte = bytes[byteOffset]
    const available = 8 - bitOffset

    const taking = available < desired ? available : desired
    const bitsLeft = 8 - bitOffset - taking
    // mask to turn of bits before bitOffset
    const mask = 0xff >> bitOffset
    // turn off offset bits and shift to drop remaining bit on the right
    const value = (mask & byte) >> bitsLeft
    bits = (bits << taking) + value

    desired -= taking
    byteOffset++
    bitOffset = 0
  }

  return bits
}
