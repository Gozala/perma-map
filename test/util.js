import * as HAMT from "../src/lib.js"
import { murmur3128 } from "@multiformats/murmur3"
import * as Path from "../src/path/InfiniteUint8Array.js"
import * as BitField from "../src/bitfield/Uint8Array.js"

const BIT_WIDTH = 8
export const config = {
  bitWidth: BIT_WIDTH,

  Path: Path.configure({
    bitWidth: BIT_WIDTH,
    hash: source => /** @type {Uint8Array} */ (murmur3128.encode(source)),
    hashSize: 8,
  }),

  BitField: BitField.configure(Math.pow(2, BIT_WIDTH)),
}

/**
 * @template T
 * @template {ReturnType<typeof HAMT.empty>|ReturnType<typeof HAMT.builder>} HAMT
 * @param {HAMT} hamt
 * @param {Iterable<[string, T]>} entries
 */
export const insert = (hamt, entries) => {
  for (const [key, value] of entries) {
    hamt = /** @type {HAMT} */ (hamt.set(key, value))
  }

  return hamt
}

/**
 * @param {[string, unknown]} left
 * @param {[string, unknown]} right
 * @returns {-1|1|0}
 */
export const byKey = ([k1], [k2]) => byName(k1, k2)

/**
 * @param {unknown} k1
 * @param {unknown} k2
 */
export const byName = (k1, k2) =>
  `${k1}`.padStart(10, "0") < `${k2}`.padStart(10, "0")
    ? -1
    : `${k1}`.padStart(10, "0") < `${k1}`.padStart(10, "0")
    ? 1
    : 0

/**
 * @template [T=string]
 * @param {number} count
 * @param {(n:number) => string} toKey
 * @param {(n:number) => T} toValue
 * @returns {IterableIterator<[string, T]>}
 */
export const iterate = function* (
  count,
  toKey = String,
  toValue = /** @type {(n:number) => any} */ (String)
) {
  let offset = 0
  while (offset < count) {
    yield [toKey(offset), toValue(offset)]
    offset += 1
  }
}
