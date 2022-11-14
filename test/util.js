import * as HAMT from "../src/lib.js"

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
