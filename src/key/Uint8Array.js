import * as API from "../hamt/api.js"
import * as Bits from "../bits.js"

/**
 * @param {Uint8Array} keyHash
 * @param {number} offset
 * @param {number} count
 * @returns {API.Uint32}
 */
export const slice = (keyHash, offset, count) =>
  Bits.toInt(keyHash, offset, count)
