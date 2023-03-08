import * as API from "./api.js"
// @ts-expect-error - has no types
import murmur from "murmurhash3js-revisited"

const utf8 = new TextEncoder()

/**
 * @typedef {(bytes:Uint8Array) => API.Uint32} Hasher
 * @type {Hasher}
 */
export const hash32 = murmur.x64.hash126

/**
 * @param {Partial<API.Options<API.Uint32>>} options
 * @returns {API.Path<API.Uint32>}
 */
/* c8 ignore next 45 */
export const configure = ({ bitWidth = 5, hash = hash32 }) => {
  const hashSize = 4
  if (bitWidth > hashSize * 8) {
    throw new RangeError(
      `Can not use bitWidth ${bitWidth} which exceeds the hashSize ${hashSize}`
    )
  }

  if (hashSize * 8 > 32) {
    throw new RangeError(
      `Can not use hashSize ${hashSize} as it can not be encoded in Uint32`
    )
  }

  // Mask for reading `bitWidth` number of bits from the end.
  const mask = 0xffffffff >>> (32 - bitWidth)

  /**
   * Determines bit position for the path entry at the given `depth`.
   * ```js
   * const key = hash("result") // 0b00011010010110010101111100110010
   * // Which is following path (in reverse as we read from the right)
   * // 10010/11001/10111/10010/00101/01101/00000 -> [ 18, 25, 23, 18, 5, 13, 0 ]
   * at(key, 0) // 0b10010 -> 18
   * at(key, 1) // 0b11001 -> 25
   * at(key, 2) // 0b10111 -> 23
   * at(key, 3) // 0b10010 -> 18
   * at(key, 4) // 0b00101 -> 5
   * at(key, 5) // 0b01101 -> 13
   * at(key, 6) // 0b00000 -> 0
   * ```
   *
   * @param {API.Uint32} path
   * @param {number} depth
   */
  const at = (path, depth) => (path >>> (depth * bitWidth)) & mask

  /**
   * @param {string} key
   * @returns {API.Uint32}
   */
  const from = key => hash(utf8.encode(key))

  return { at, from, size: Math.ceil((hashSize * 8) / bitWidth) }
}
