import * as API from "./api.js"
import * as Bits from "../bits.js"
const utf8 = new TextEncoder()
import { murmur3128 } from "@multiformats/murmur3"

/**
 * @param {Uint8Array} bytes
 */
export const hash128 = bytes =>
  /** @type {Uint8Array} */ (murmur3128.encode(bytes))

/**
 * @param {Partial<API.Options<Uint8Array>>} options
 * @returns {API.Path<Uint8Array>}
 */
export const configure = ({
  bitWidth = 8,
  hash = hash128,
  hashSize = hash(new Uint8Array()).byteLength,
} = {}) => {
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

    return Bits.toInt(path, offset, bitWidth)
  }

  /**
   * @param {string} key
   * @returns {Uint8Array}
   */
  const from = key => hash(utf8.encode(key))

  return { from, at, size: Math.ceil((hashSize * 8) / bitWidth) }
}
