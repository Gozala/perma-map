import * as HAMT from "./lib.js"
import * as Node from "./node.js"
import * as Path from "./path/InfiniteUint8Array.js"

export * from "./hamt/api.js"

export const bitWidth = 8
export const config = {
  bitWidth,
  Path: Path.configure({ bitWidth }),
}

export const empty = HAMT.empty.bind(config)
export const builder = HAMT.builder.bind(config)

/**
 * @param {Iterable<[string, unknown]>} entries
 */
export const from = entries => HAMT.from(entries, config)

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
