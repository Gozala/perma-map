import * as API from "./api.js"
import * as Bits from "../bits.js"
const utf8 = new TextEncoder()

/**
 * @param {API.Options<Uint8Array>} options
 * @returns {API.Path<Uint8Array>}
 */
export const configure = ({ bitWidth = 8, hash, hashSize }) => {
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
