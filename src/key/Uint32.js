// @ts-expect-error - has no types
import murmur from "murmurhash3js-revisited"
import * as API from "../hamt/api.js"

/**
 * @typedef {(bytes:Uint8Array) => API.Uint32} Hasher
 * @type {Hasher}
 */
export const create = murmur.x86.hash32

export const size = 32

/**
 *
 * @param {API.Uint32} keyHash
 * @param {number} offset
 * @param {number} count
 * @returns {API.Uint32}
 */
export const slice = (keyHash, offset, count) =>
  (keyHash >>> offset) & (0xffffffff >>> (32 - count))
