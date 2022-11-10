export * from "../src/unixfs.js"
import * as UnixFS from "../src/unixfs.js"

/**
 * @template T
 * @typedef {
 * | { prefix: string, key: string, value: T}
 * | { prefix: string, bitfield: string, links: Link<T>[] }
 * } Link
 */
/**
 * @template T
 * @param {UnixFS.BitmapIndexedNode<T>} node
 * @param {number} depth
 * @returns {{bitfield:number[], links?:Link<T>[]}}
 */
const inspectNode = (node, depth = Infinity) => ({
  bitfield: [...UnixFS.bitField(node)],
  ...(depth > 0 && {
    links: [...UnixFS.iterate(node)].map(child =>
      child.node
        ? {
            prefix: child.prefix,
            ...inspectNode(child.node, depth - 1),
          }
        : child
    ),
  }),
})

/**
 * @template T
 * @param {UnixFS.PersistentHashMap<T>} hamt
 * @param {number} [depth]
 */
export const inspect = ({ root }, depth) => inspectNode(root, depth)
