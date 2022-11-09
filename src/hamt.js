import * as API from "./hamt/api.js"

export * from "./hamt/api.js"

export { API }

const utf8 = new TextEncoder()

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @implements {API.BitmapIndexedNode<T, K, C>}
 */
class BitmapIndexedNode {
  /**
   * @template T
   * @template {string} K
   * @template {API.Config} C
   * @param {C} config
   * @param {API.Edit|null} edit
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  static withConfig(config, edit = null) {
    return new this(
      edit,
      config.BitField.empty(),
      config.BitField.empty(),
      /** @type {API.Children<T, K, C>} */ ([]),
      config
    )
  }

  /**
   * @param {API.Edit|null} edit
   * @param {ReturnType<C['BitField']['empty']>} datamap
   * @param {ReturnType<C['BitField']['empty']>} nodemap
   * @param {API.Children<T, K, C>} children
   * @param {C} config
   */
  constructor(edit, datamap, nodemap, children, config) {
    this.edit = edit
    this.config = config
    this.datamap = datamap
    this.nodemap = nodemap
    this.children = children
  }

  get nodeArity() {
    return this.config.BitField.popcount(this.nodemap)
  }
  get dataArity() {
    return this.config.BitField.popcount(this.datamap)
  }

  /**
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  empty() {
    return BitmapIndexedNode.withConfig(this.config)
  }

  /**
   * @template X
   * @param {API.Uint32} depth
   * @param {ReturnType<C["Path"]["from"]>} path
   * @param {K} key
   * @param {X} notFound
   * @returns {T|X}
   */

  lookup(depth, path, key, notFound) {
    const { datamap, nodemap, config } = this
    const offset = config.Path.at(path, depth)

    // If bit is set in the data bitmap we have some key, value under the
    // matching hash segment.
    if (config.BitField.get(datamap, offset)) {
      const index = config.BitField.popcount(datamap, offset)
      // If key matches actual key in the map we found the the value
      // otherwise we did not.
      if (keyAt(this, index) === key) {
        return valueAt(this, index)
      } else {
        return notFound
      }
    }
    // If bit is set in the node bitmapt we have a node under the
    // matching hash segment.
    else if (config.BitField.get(nodemap, offset)) {
      // Resolve node and continue lookup within it.
      return resolveNode(this, offset).lookup(depth + 1, path, key, notFound)
    }
    // If we have neither node nor key-pair for this hash segment
    // we return notFound.
    else {
      return notFound
    }
  }

  /**
   * @template {string} R
   * @param {API.Edit|null} edit
   * @param {API.Uint32} depth
   * @param {ReturnType<C["Path"]["from"]>} path
   * @param {K|R} key
   * @param {T} value
   * @param {{value:boolean}} addedLeaf
   * @returns {API.BitmapIndexedNode<T, K | R, C>}
   */
  associate(edit, depth, path, key, value, addedLeaf) {
    const { datamap, nodemap, children, config } = this
    const offset = config.Path.at(path, depth)
    // If bit is set in the data bitmap we have some key, value under the
    // matching hash segment.
    if (config.BitField.get(datamap, offset)) {
      const index = config.BitField.popcount(datamap, offset)
      const found = keyAt(this, index)
      if (key === found) {
        if (valueAt(this, index) === value) {
          return this
        } else {
          return BitmapIndexedNode.copyAndSet(this, edit, index, value)
        }
      } else {
        const node = BitmapIndexedNode.mergeTwoPairs(
          config,
          edit,
          depth + 1,
          config.Path.from(found),
          found,
          valueAt(this, index),
          path,
          key,
          value
        )
        addedLeaf.value = true

        return BitmapIndexedNode.copyAndMigrateToNode(this, edit, offset, node)
      }
    }
    // If bit is set in the node bitmapt we have a node under the
    // matching hash segment.
    else if (config.BitField.get(nodemap, offset)) {
      const child = resolveNode(this, offset)
      const newChild = child.associate(
        edit,
        depth + 1,
        path,
        key,
        value,
        addedLeaf
      )
      if (child === newChild) {
        return this
      } else {
        return BitmapIndexedNode.copyAndSetChild(this, edit, offset, newChild)
      }
    }
    // If we have neither node nor a key-value for this hash segment. We copy
    // current children and add new key-value pair
    else {
      const index = config.BitField.popcount(datamap, offset)
      const position = keyPosition(index)
      addedLeaf.value = true

      return new BitmapIndexedNode(
        edit,
        // Capture new entry in the data bitmap
        config.BitField.set(datamap, offset),
        nodemap,
        // Splice new entry into a location corresponding to the hash.
        /** @type {API.Children<T, K|R, C>} */
        ([
          ...children.slice(0, position),
          key,
          value,
          ...children.slice(position),
        ]),
        config
      )
    }
  }

  /**
   * @param {API.Edit|null} edit
   * @param {API.Uint32} depth
   * @param {ReturnType<C["Path"]["from"]>} path
   * @param {K} key
   * @param {{value:boolean}} removedLeaf
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  dissociate(edit, depth, path, key, removedLeaf) {
    const { datamap, nodemap, children, config } = this
    const offset = config.Path.at(path, depth)
    // If bit is set in the data bitmap we have some key, value under the
    // matching hash segment.
    if (config.BitField.get(datamap, offset)) {
      const index = config.BitField.popcount(datamap, offset)
      const found = keyAt(this, index)
      if (key === found) {
        removedLeaf.value = true

        if (
          config.BitField.popcount(datamap) === 2 &&
          config.BitField.popcount(nodemap) === 0
        ) {
          return new BitmapIndexedNode(
            edit,
            config.BitField.unset(datamap, offset),
            config.BitField.empty(),
            index === 0
              ? [children[2], children[3]]
              : [children[0], children[1]],
            config
          )
        } else {
          return BitmapIndexedNode.copyAndRemoveValue(this, edit, offset)
        }
      }
      // If keys do not match we don't have an entry for this key so this is a
      // noop
      else {
        return this
      }
    }
    // If bit is set in the node bitmapt we have a node under the
    // matching hash segment.
    else if (config.BitField.get(nodemap, offset)) {
      const child = resolveNode(this, offset)
      const newChild = child.dissociate(edit, depth + 1, path, key, removedLeaf)
      if (child === newChild) {
        return this
      } else {
        if (hasSingleEntry(newChild)) {
          if (
            config.BitField.popcount(datamap) === 0 &&
            config.BitField.popcount(nodemap) === 1
          ) {
            return newChild
          } else {
            return BitmapIndexedNode.copyAndMigrateToInline(
              this,
              edit,
              offset,
              newChild
            )
          }
        } else {
          return BitmapIndexedNode.copyAndSetChild(this, edit, offset, newChild)
        }
      }
    }
    // If we have neither node nor a key-value for this hash segment this is a
    // noop.
    else {
      return this
    }
  }

  /**
   * @template T
   * @template {string} K
   * @template {API.Config} C
   * @param {BitmapIndexedNode<T, K, C>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @returns {BitmapIndexedNode<T, K, C>}
   */
  static copyAndRemoveValue(
    { datamap, nodemap, children, config },
    edit,
    offset
  ) {
    const index = keyPosition(config.BitField.popcount(datamap, offset))

    return new BitmapIndexedNode(
      edit,
      config.BitField.unset(datamap, offset),
      nodemap,
      [...children.slice(0, index), ...children.slice(index + 2)],
      config
    )
  }

  /**
   * @template T
   * @template {string} K
   * @template {API.Config} C
   * @param {API.BitmapIndexedNode<T, K, C>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @param {API.Node<T, K, C>} child
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */

  static copyAndMigrateToInline(node, edit, offset, child) {
    const { datamap, nodemap, config } = node
    const oldIndex = nodePosition(node, offset)
    const newIndex = keyPosition(config.BitField.popcount(datamap, offset))
    const children = node.children.slice()

    // remove the node that we are inlining
    children.splice(oldIndex, 1)
    // add key-value pair where it wolud fall
    children.splice(newIndex, 0, child.children[0], child.children[1])

    return new BitmapIndexedNode(
      edit,
      config.BitField.set(datamap, offset),
      config.BitField.unset(nodemap, offset),
      children,
      node.config
    )
  }

  /**
   * @param {API.Edit|null} edit
   * @return {API.BitmapIndexedNode<T, K, C>}
   */
  fork(edit = null) {
    if (canEdit(this.edit, edit)) {
      return this
    } else {
      return new BitmapIndexedNode(
        edit,
        this.datamap,
        this.nodemap,
        this.children.slice(),
        this.config
      )
    }
  }

  /**
   * @template T
   * @template {string} K
   * @template {API.Config} C
   * @param {API.BitmapIndexedNode<T, K, C>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @param {T} value
   */
  static copyAndSet(node, edit, offset, value) {
    const fork = node.fork(edit)
    fork.children[valuePosition(offset)] = value
    return fork
  }

  /**
   * @template T
   * @template {string} K
   * @template {API.Config} C
   * @param {API.BitmapIndexedNode<T, K, C>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @param {API.Node<T, K, C>} child
   */
  static copyAndSetChild(node, edit, offset, child) {
    const fork = node.fork(edit)
    fork.children[nodePosition(node, offset)] = child
    return fork
  }

  /**
   * @template T
   * @template {string} K
   * @template {API.Config} C
   * @param {API.BitmapIndexedNode<T, K, C>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @param {API.Node<T, K, C>} child
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  static copyAndMigrateToNode(node, edit, offset, child) {
    const { nodemap, datamap, config, children } = node
    const index = config.BitField.popcount(datamap, offset)
    // Previous id corresponds to the key position
    const oldId = keyPosition(index)
    const newId = nodePosition(node, offset)

    return new BitmapIndexedNode(
      edit,
      // datamap without old child offset off
      config.BitField.unset(datamap, offset),
      // nodemap with new nodes bit set
      config.BitField.set(nodemap, offset),
      /** @type {API.Children<T, K, C>} */
      ([
        // children up to the one we encountered conflict at
        ...children.slice(0, oldId),
        // then skip key and value and copy element up to a node place
        ...children.slice(oldId + 2, newId + 1),
        // new node
        child,
        // and then rest of the children
        ...children.slice(newId + 1),
      ]),
      config
    )
  }

  /**
   * @template T
   * @template {string} K
   * @template {API.Config} C
   * @param {C} config
   * @param {API.Edit|null} edit
   * @param {number} depth
   * @param {ReturnType<C["Path"]["from"]>} oldPath
   * @param {K} oldKey
   * @param {T} oldValue
   * @param {ReturnType<C["Path"]["from"]>} newPath
   * @param {K} newKey
   * @param {T} newValue
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  static mergeTwoPairs(
    config,
    edit,
    depth,
    oldPath,
    oldKey,
    oldValue,
    newPath,
    newKey,
    newValue
  ) {
    const oldId = config.Path.at(oldPath, depth)
    const newId = config.Path.at(newPath, depth)

    // If hashes still match create another intermediery node and merge these
    // two nodes at next depth level.
    if (oldId === newId) {
      return new BitmapIndexedNode(
        edit,
        config.BitField.empty(),
        config.BitField.of(oldId),
        [
          BitmapIndexedNode.mergeTwoPairs(
            config,
            edit,
            depth + 1,
            oldPath,
            oldKey,
            oldValue,
            newPath,
            newKey,
            newValue
          ),
        ],
        config
      )
    }
    // otherwise create new node with both key-value pairs as it's children
    else {
      // We insert child with a lower index first so that we can derive it's
      // index on access via popcount
      /** @type {API.Children<T, K, C>} */
      const children =
        oldId < newId
          ? [oldKey, oldValue, newKey, newKey]
          : [newKey, newKey, oldKey, oldValue]

      return new BitmapIndexedNode(
        edit,
        config.BitField.of(oldId, newId),
        config.BitField.empty(),
        children,
        config
      )
    }
  }

  /**
   * @returns {IterableIterator<[K, T]>}
   */
  *entries() {
    const { children } = this
    let offset = 0
    const count = children.length
    while (offset < count) {
      const key = children[offset]
      if (typeof key === "string") {
        offset += 1
        const value = children[offset]
        yield /** @type {[K, T]} */ ([key, value])
        offset += 1
      } else {
        break
      }
    }

    while (offset < count) {
      const node = /** @type {API.Node<T, K>} */ (children[offset])
      yield* node.entries()
      offset += 1
    }
  }

  *keys() {
    const { children } = this
    let offset = 0
    const count = children.length
    while (offset < count) {
      const key = children[offset]
      if (typeof key === "string") {
        yield /** @type {K} */ (key)
        offset += 2
      } else {
        break
      }
    }

    while (offset < count) {
      const node = /** @type {API.Node<T, K>} */ (children[offset])
      yield* node.keys()
      offset += 1
    }
  }

  *values() {
    const { children } = this
    let offset = 0
    const count = children.length
    while (offset < count) {
      const key = children[offset]
      if (typeof key === "string") {
        offset += 1
        yield /** @type {T} */ (children[offset])
        offset += 1
      } else {
        break
      }
    }

    while (offset < count) {
      const node = /** @type {API.Node<T, K>} */ (children[offset])
      yield* node.values()
      offset += 1
    }
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.Node<T, K, C>} node
 * @returns {node is API.BitmapIndexedNode<T, K, C>}
 */
const hasSingleEntry = node => node.nodeArity === 0 && node.dataArity === 1

/**
 * @template T
 * @template {string} K
 * @param {API.Node<T, K>} node
 * @param {number} index
 */
export const keyAt = ({ children }, index) =>
  /** @type {K} */ (children[keyPosition(index)])

/**
 * @param {number} index
 */
export const keyPosition = index => index * 2

/**
 * @template T
 * @template {string} K
 * @param {API.Node<T, K>} node
 * @param {number} index
 */
export const valueAt = ({ children }, index) =>
  /** @type {T} */ (children[valuePosition(index)])

/**
 * @param {number} index
 */
export const valuePosition = index => index * 2 + 1

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {number} offset
 */
export const resolveNode = (node, offset) =>
  /** @type {API.Node<T, K, C>} */ (node.children[nodePosition(node, offset)])

/**
 * @template T
 * @template {string} K
 * @param {API.BitmapIndexedNode<T, K>} node
 * @param {number} offset
 */
const nodePosition = ({ children, nodemap, config }, offset) =>
  children.length - 1 - config.BitField.popcount(nodemap, offset)

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

  get tableSize() {
    return Math.pow(2, this.config.bitWidth)
  }
  get size() {
    return this.count
  }

  /**
   * @returns {API.PersistentHashMap<T, K, C>}
   */
  clone() {
    return new PersistentHashMap(this.count, this.root, this.config)
  }

  /**
   * @returns {API.PersistentHashMap<T, K, C>}
   */
  empty() {
    return new PersistentHashMap(
      0,
      BitmapIndexedNode.withConfig(this.config, null),
      this.config
    )
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    const value = this.root.lookup(0, this.config.Path.from(key), key, notFound)
    return value !== notFound
  }
  /**
   * @param {K} key
   * @returns {T|undefined}
   */
  get(key) {
    return this.root.lookup(0, this.config.Path.from(key), key, undefined)
  }
  /**
   * @template {string} R
   * @param {R} key
   * @param {T} value
   * @returns {API.PersistentHashMap<T, K|R, C>}
   */
  set(key, value) {
    const addedLeaf = { value: false }
    const root = this.root.associate(
      null,
      0,
      this.config.Path.from(key),
      key,
      value,
      addedLeaf
    )
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
   * @returns {API.PersistentHashMap<T, K, C>}
   */
  delete(key) {
    const root = this.root.dissociate(
      null,
      0,
      this.config.Path.from(key),
      key,
      {
        value: false,
      }
    )
    if (root === this.root) {
      return this
    } else {
      return new PersistentHashMap(this.count - 1, root, this.config)
    }
  }

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
 * @implements {API.HashMapBuilder<T, K, C>}
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

  get tableSize() {
    return Math.pow(2, this.config.bitWidth)
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
   * @returns {API.HashMapBuilder<T, K|R, C>}
   */
  set(key, value) {
    if (this.edit) {
      const addedLeaf = { value: false }
      const root = this.root.associate(
        this.edit,
        0,
        this.config.Path.from(key),
        key,
        value,
        addedLeaf
      )

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
   * @returns {API.HashMapBuilder<T, K, C>}
   */
  delete(key) {
    if (this.edit) {
      if (this.count === 0) {
        return this
      }
      const removedLeaf = { value: false }
      const root = this.root.dissociate(
        this.edit,
        0,
        this.config.Path.from(key),
        key,
        removedLeaf
      )
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

  /**
   *
   * @returns {API.PersistentHashMap<T, K, C>}
   */
  build() {
    if (this.edit) {
      this.edit = null
      return new PersistentHashMap(this.count, this.root, this.config)
    } else {
      throw new Error(`.build was called on the finalized builder`)
    }
  }
}

const notFound = new String("not found")

/**
 * @template {string} K
 * @template T
 * @template {API.Config} C
 * @param {C} config
 * @returns {API.PersistentHashMap<T, K, C>}
 */
export const empty = config =>
  new PersistentHashMap(0, BitmapIndexedNode.withConfig(config, null), config)

/**
 * @template {string} K
 * @template T
 * @template {API.Config} C
 * @param {C} config
 * @returns {API.HashMapBuilder<T, K, C>}
 */
export const builder = config => {
  const edit = {}
  return new HashMapBuilder(
    edit,
    0,
    BitmapIndexedNode.withConfig(config, edit),
    config
  )
}

/**
 * @param {API.Edit|null} owner
 * @param {API.Edit|null} editor
 */
const canEdit = (owner, editor) => owner != null && owner === editor
