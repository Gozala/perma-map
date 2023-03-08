export * from "./api.js"
import * as Node from "./node.js"
import { create as createBitmapIndexedNode } from "./node.js"
import * as API from "./api.js"
import * as Uint32Path from "./path/Uint32.js"
import * as Uint8ArrayPath from "./path/Uint8Array.js"
import * as Uint32BitField from "./bitfield/Uint32.js"
import * as Uint8ArrayBitField from "./bitfield/Uint8Array.js"

const NOT_FOUND = new RangeError("Not Found")

/**
 * A `bitWidth` determines the number of bits of the hash to use for index
 * calculation at each level of the tree. In first layer will distribute
 * children by the first `bitWidth` bits of the key hash. In the next layer
 * next `bitWidth` number of bits of the key hash are used to determine
 * placement of it's children and so on. Each node in the tree will hold
 * `2 ** bitWidth` number of elements.
 *
 * For example when we insert an entry named `result` it will generate a
 * folowing hash (with murmur3 32) `442064690` which in binary would be
 *
 * ```
 * 11010010110010101111100110010
 * ```
 *
 * Which will correspond to a following key path
 *
 * ```
 * 11010/01011/00101/01111/10011/0010
 * ```
 *
 * Whis in decimals would be
 *
 * ```ts
 * 26/11/5/15/19/2'
 * ```
 *
 * If we then insert `fish` it would produce following path
 *
 * ```ts
 * 26/3/4/18/28/19/1
 * ```
 * @template [V=unknown]
 * @template {string} [K=string]
 * @template {API.Config} [C=API.Config<API.Uint32>]
 * @param {Partial<C>} [options]
 * @returns {API.PersistentHashMap<V, K, C>}
 */
export const empty = options => {
  const config = configure(options)
  return new PersistentHashMap(0, createBitmapIndexedNode(config, null), config)
}

/**
 * @template {API.Config} [C=API.Config<API.Uint32>]
 * @param {Partial<C>} config
 * @returns {C}
 */
const configure = ({
  bitWidth = 5,
  /* c8 ignore next 4 */
  BitField = bitWidth === 5 ? Uint32BitField : Uint8ArrayBitField,
  Path = bitWidth === 5
    ? Uint32Path.configure({ bitWidth })
    : Uint8ArrayPath.configure({ bitWidth }),
} = {}) => /** @type {C} */ ({ bitWidth, BitField, Path })

/**
 * Creates HashMap from the provided entries.
 *
 * @template [V=unknown]
 * @template {string} [K=string]
 * @template {API.Config} [C=API.Config<API.Uint32>]
 * @param {Iterable<[K, V]>} entries
 * @param {Partial<C>} [options]
 * @returns {API.PersistentHashMap<V, K, C>}
 */
export const from = (entries, options) => {
  const node = /** @type {API.HashMapBuilder<V, K, C>} */ (builder(options))
  for (const [key, value] of entries) {
    node.set(key, value)
  }

  return node.build()
}

/**
 * @template T
 * @template {string} K
 * @param {API.HAMT<T, K>} hamt
 * @param {K} key
 */
export const has = (hamt, key) =>
  Node.get(hamt.root, key, NOT_FOUND) !== NOT_FOUND

/**
 * @template T
 * @template {string} K
 * @template [U=undefined]
 * @param {API.HAMT<T, K>} hamt
 * @param {K} key
 * @param {U} notFound
 * @returns {T|U}
 */
export const get = (hamt, key, notFound = /** @type {U} */ (undefined)) =>
  Node.get(hamt.root, key, notFound)

/**
 * @template {string} K
 * @template T
 * @template {API.Config} C
 * @param {Partial<C>} [options]
 * @returns {API.HashMapBuilder<T, K, C>}
 */
export const builder = options => {
  const edit = {}
  const config = configure(options)
  return new HashMapBuilder(
    edit,
    0,
    createBitmapIndexedNode(config, edit),
    config
  )
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @implements {API.PersistentHashMap<T, K, C>}
 */
class PersistentHashMap {
  /**
   *
   * @param {number} count
   * @param {API.BitmapIndexedNode<T, K, C>} root
   * @param {C} config
   */
  constructor(count = 0, root, config) {
    this.count = count
    this.root = root
    this.config = config
  }

  get size() {
    return this.count
  }

  clone() {
    return new PersistentHashMap(this.count, this.root, this.config)
  }

  /**
   * @returns {API.PersistentHashMap<T, K, C>}
   */
  empty() {
    return new PersistentHashMap(
      0,
      createBitmapIndexedNode(this.config, null),
      this.config
    )
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    return has(this, key)
  }
  /**
   * @param {K} key
   * @returns {T|undefined}
   */
  get(key) {
    return Node.get(this.root, key, undefined)
  }
  /**
   * @template {string} R
   * @param {R} key
   * @param {T} value
   * @returns {PersistentHashMap<T, K|R, C>}
   */
  set(key, value) {
    const addedLeaf = { value: false }
    const root = Node.set(this.root, null, key, value, addedLeaf)
    if (root === this.root) {
      return this
    } else {
      return new PersistentHashMap(
        addedLeaf.value ? this.count + 1 : this.count,
        root,
        this.config
      )
    }
  }
  /**
   * @param {K} key
   */
  delete(key) {
    const root = Node.delete(this.root, null, key, { value: false })

    if (root === this.root) {
      return this
    } else {
      return new PersistentHashMap(this.count - 1, root, this.config)
    }
  }

  /* c8 ignore next 3 */
  get bitField() {
    return this.config.BitField.or(this.root.datamap, this.root.nodemap)
  }

  [Symbol.iterator]() {
    return this.entries()
  }

  entries() {
    return this.root.entries()
  }
  keys() {
    return this.root.keys()
  }
  values() {
    return this.root.values()
  }

  /**
   * @returns {API.HashMapBuilder<T, K, C>}
   */

  createBuilder() {
    return new HashMapBuilder({}, this.count, this.root, this.config)
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 */
class HashMapBuilder {
  /**
   * @param {API.Edit} edit
   * @param {number} count
   * @param {API.BitmapIndexedNode<T, K, C>} root
   * @param {C} config
   */
  constructor(edit, count, root, config) {
    /**
     * @type {API.Edit|null}
     * @private
     */
    this.edit = edit
    /**
     * @private
     */
    this.count = count
    this.root = root
    this.config = config
  }

  get size() {
    if (this.edit) {
      return this.count
    } else {
      throw new Error(`.size was accessed on the finalized builder`)
    }
  }
  /**
   * @template {string} R
   * @param {R} key
   * @param {T} value
   * @returns {HashMapBuilder<T, K|R, C>}
   */
  set(key, value) {
    if (this.edit) {
      const addedLeaf = { value: false }
      const root = Node.set(this.root, this.edit, key, value, addedLeaf)

      if (this.root !== root) {
        this.root = /** @type {API.BitmapIndexedNode<T, K, C>} */ (root)
      }

      if (addedLeaf.value) {
        this.count += 1
      }

      return this
    } else {
      throw new Error(`.set was called on the finalized builder`)
    }
  }
  /**
   * @param {K} key
   */
  delete(key) {
    if (this.edit) {
      if (this.count === 0) {
        return this
      }
      const removedLeaf = { value: false }
      const root = Node.delete(this.root, this.edit, key, removedLeaf)

      if (root !== this.root) {
        this.root = root
      }
      if (removedLeaf.value) {
        this.count -= 1
      }
      return this
    } else {
      throw new Error(`.delete was called on the finalized builder`)
    }
  }

  build() {
    if (this.edit) {
      this.edit = null
      return new PersistentHashMap(this.count, this.root, this.config)
    } else {
      throw new Error(`.build was called on the finalized builder`)
    }
  }
}
