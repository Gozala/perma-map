import * as HAMT from "./lib.js"

/**
 * @template T
 * @template {string} K
 * @template Bits, Bitmap
 * @param {HAMT.HAMT<T, K, HAMT.Config<Bits, Bitmap>>} hamt
 */
export const bitField = ({ root, config }) =>
  config.BitField.or(root.datamap, root.nodemap)

/**
 * Maps HAMT node into IPFS UnixFS compatible format.
 *
 * @template T
 * @param {HAMT.BitmapIndexedNode<T>} node
 */
export const iterate = function* (node) {
  const { datamap, nodemap, config } = node
  const { BitField: bitfield } = config
  const size = bitfield.count(node.datamap)
  let bitOffset = 0
  let dataCount = 0
  let nodeCount = 0
  while (bitOffset < size) {
    const label = bitOffset.toString(16).toUpperCase().padStart(2, "0")
    if (bitfield.get(datamap, bitOffset)) {
      const key = HAMT.keyAt(node, dataCount)
      yield {
        label: `${label}${key}`,
        bitOffset,
        index: dataCount,
        key,
        value: HAMT.valueAt(node, dataCount),
      }
      dataCount++
    } else if (bitfield.get(node.nodemap, bitOffset)) {
      yield {
        label,
        bitOffset,
        index: nodeCount,
        node: HAMT.resolveNode(node, nodeCount),
      }
      nodeCount += 1
    }
    bitOffset++
  }
}
