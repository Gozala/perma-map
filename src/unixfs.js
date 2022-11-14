import * as HAMT from "./lib.js"
import * as Node from "./node.js"
import * as Path from "./path/InfiniteUint8Array.js"

export * from "./api.js"

export { Path }

export const bitWidth = 8
export const config = {
  bitWidth,
  Path: Path.configure({ bitWidth }),
}

/**
 * @param {HAMT.PersistentHashMap} hamt
 */
export const tableSize = hamt => Math.pow(2, hamt.config.bitWidth)

/**
 * @template [T=unknown]
 * @template {string} [K=string]
 * @template {HAMT.Config} [C=HAMT.Config<Uint8Array>]
 * @param {Partial<C>} options
 * @returns {HAMT.PersistentHashMap<T, K, C>}
 */
export const empty = (options = /** @type {C} */ (config)) =>
  HAMT.empty(options)

/**
 * @template [T=unknown]
 * @template {string} [K=string]
 * @template {HAMT.Config} [C=HAMT.Config<Uint8Array>]
 * @param {Partial<C>} options
 * @returns {HAMT.HashMapBuilder<T, K, C>}
 */
export const builder = (options = /** @type {C} */ (config)) =>
  HAMT.builder(options)

/**
 * @template [V=unknown]
 * @template {string} [K=string]
 * @template {HAMT.Config} [C=HAMT.Config<Uint8Array>]
 * @param {Iterable<[K, V]>} entries
 * @param {Partial<C>} options
 */
export const from = (entries, options = /** @type {C} */ (config)) =>
  HAMT.from(entries, options)

/**
 * @template T
 * @template {string} K
 * @template Bits, Bitmap
 * @param {HAMT.BitmapIndexedNode<T, K, HAMT.Config<Bits, Bitmap>>} hamt
 */
export const bitField = ({ datamap, nodemap, config: { BitField } }) =>
  withoutLeadingZeros(BitField.toBytes(BitField.or(datamap, nodemap)))

/**
 * @param {Uint8Array} bytes
 */
const withoutLeadingZeros = bytes => {
  let offset = 0
  while (offset < bytes.byteLength) {
    if (bytes[offset] !== 0) {
      return bytes.subarray(offset)
    }
    offset += 1
  }
  return bytes.subarray(offset)
}

/**
 * Maps HAMT node into IPFS UnixFS compatible format.
 *
 * @template T
 * @template {string} K
 * @template {HAMT.Config} C
 * @param {HAMT.BitmapIndexedNode<T, K, C>} root
 * @returns {IterableIterator<{prefix:string, key:K, value:T, node?:void}|{prefix:string, node:HAMT.BitmapIndexedNode<T, K, C>}>}
 */
export const iterate = function* (root) {
  const { config, datamap, nodemap } = root
  const { BitField: bitfield } = config
  const size = bitfield.size(datamap)
  let bitOffset = 0
  let dataCount = 0
  while (bitOffset < size) {
    const prefix = bitOffset.toString(16).toUpperCase().padStart(2, "0")
    if (bitfield.get(datamap, bitOffset)) {
      const key = Node.keyAt(root, dataCount)
      yield {
        prefix,
        key,
        value: Node.valueAt(root, dataCount),
      }
      dataCount++
    } else if (bitfield.get(nodemap, bitOffset)) {
      yield {
        prefix,
        // UnixFS never contains hash collision nodes because it uses
        // inifinite hashes
        node: /** @type {HAMT.BitmapIndexedNode<T, K, C>} */ (
          Node.resolveNode(root, bitOffset)
        ),
      }
    }
    bitOffset++
  }
}
