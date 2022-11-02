import * as API from "./hamt/api.js"
import * as Hash from "./hash.js"
import * as BitField from "./hamt/bitfield.js"

export * from "./hamt/api.js"

export { API }

const utf8 = new TextEncoder()

/**
 * @template T
 * @template {string} K
 * @implements {API.Node<T, K>}
 */
class BitmapIndexedNode {
  /**
   * @param {API.Config} config
   * @param {API.Edit|null} edit
   */
  static withConfig(config, edit = null) {
    return new this(
      edit,
      createBitField(config),
      createBitField(config),
      [],
      config
    )
  }

  /**
   * @param {API.Edit|null} edit
   * @param {Uint8Array} datamap
   * @param {Uint8Array} nodemap
   * @param {Array<API.BitmapIndexedNode<T, K>|K|T>} children
   * @param {API.Config} config
   */
  constructor(edit, datamap, nodemap, children, config) {
    this.edit = edit
    this.config = config
    this.datamap = datamap
    this.nodemap = nodemap
    this.children = children
  }

  get nodeArity() {
    return BitField.popcount(this.nodemap)
  }
  get dataArity() {
    return BitField.popcount(this.datamap)
  }

  empty() {
    return BitmapIndexedNode.withConfig(this.config)
  }

  /**
   * @template X
   * @param {API.Uint32} shift
   * @param {Uint8Array} key
   * @param {K} name
   * @param {X} notFound
   * @returns {T|X}
   */

  lookup(shift, key, name, notFound) {
    const { datamap, nodemap, config } = this
    const offset = Hash.read(key, shift / config.bitWidth, config)
    // If bit is set in the data bitmap we have some key, value under the
    // matching hash segment.
    if (BitField.get(datamap, offset)) {
      const index = BitField.popcount(datamap, 0, offset)
      // If key matches actual key in the map we found the the value
      // otherwise we did not.
      if (keyAt(this, index) === name) {
        return valueAt(this, index)
      } else {
        return notFound
      }
    }
    // If bit is set in the node bitmapt we have a node under the
    // matching hash segment.
    else if (BitField.get(nodemap, offset)) {
      // Resolve node and continue lookip within it.
      return resolveNode(this, offset).lookup(
        incShift(config, shift),
        key,
        name,
        notFound
      )
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
   * @param {API.Uint32} shift
   * @param {Uint8Array} key
   * @param {K|R} name
   * @param {T} value
   * @param {{value:boolean}} addedLeaf
   * @returns {BitmapIndexedNode<T, K | R>}
   */
  associate(edit, shift, key, name, value, addedLeaf) {
    const { datamap, nodemap, children, config } = this
    const offset = Hash.read(key, shift / config.bitWidth, config)
    // If bit is set in the data bitmap we have some key, value under the
    // matching hash segment.
    if (BitField.get(datamap, offset)) {
      const index = BitField.popcount(datamap, 0, offset)
      const found = keyAt(this, index)
      if (name === found) {
        if (valueAt(this, index) === value) {
          return this
        } else {
          return BitmapIndexedNode.copyAndSet(this, edit, index, value)
        }
      } else {
        const node = BitmapIndexedNode.mergeTwoPairs(
          config,
          edit,
          incShift(config, shift),
          utf8.encode(found),
          found,
          valueAt(this, index),
          key,
          name,
          value
        )
        addedLeaf.value = true

        return BitmapIndexedNode.copyAndMigrateToNode(this, edit, offset, node)
      }
    }
    // If bit is set in the node bitmapt we have a node under the
    // matching hash segment.
    else if (BitField.get(nodemap, offset)) {
      const child = resolveNode(this, offset)
      const newChild = child.associate(
        edit,
        incShift(config, shift),
        key,
        name,
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
      const index = BitField.popcount(datamap, 0, offset)
      const position = keyPosition(index)
      addedLeaf.value = true

      return new BitmapIndexedNode(
        edit,
        // Capture new entry in the data bitmap
        BitField.set(datamap.slice(), offset),
        nodemap.slice(),
        // Splice new entry into a location corresponding to the hash.
        /** @type {API.Children<T, K|R>} */
        ([
          ...children.slice(0, position),
          name,
          value,
          ...children.slice(position),
        ]),
        config
      )
    }
  }

  /**
   * @param {API.Edit|null} edit
   * @param {API.Uint32} shift
   * @param {Uint8Array} key
   * @param {K} name
   * @param {{value:boolean}} removedLeaf
   * @returns {API.BitmapIndexedNode<T, K>}
   */
  dissociate(edit, shift, key, name, removedLeaf) {
    const { datamap, nodemap, children, config } = this
    const offset = Hash.read(key, shift / config.bitWidth, config)
    // If bit is set in the data bitmap we have some key, value under the
    // matching hash segment.
    if (BitField.get(datamap, offset)) {
      const index = BitField.popcount(datamap, 0, offset)
      const found = keyAt(this, index)
      if (name === found) {
        removedLeaf.value = true

        if (
          BitField.popcount(datamap) === 2 &&
          BitField.popcount(nodemap) === 0
        ) {
          const newDatamap = BitField.unset(datamap.slice(), offset)
          return new BitmapIndexedNode(
            edit,
            newDatamap,
            createBitField(config),
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
    else if (BitField.get(nodemap, offset)) {
      const child = resolveNode(this, offset)
      const newChild = child.dissociate(
        edit,
        incShift(config, shift),
        key,
        name,
        removedLeaf
      )
      if (child === newChild) {
        return this
      } else {
        if (hasSingleEntry(newChild)) {
          if (
            BitField.popcount(datamap) === 0 &&
            BitField.popcount(nodemap) === 1
          ) {
            return newChild
          } else {
            return BitmapIndexedNode.copyAndMigrateToInline(
              this,
              edit,
              offset,
              // @ts-expect-error - It is actually BitmapIndexedNode
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
   * @param {BitmapIndexedNode<T, K>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @returns {BitmapIndexedNode<T, K>}
   */
  static copyAndRemoveValue(
    { datamap, nodemap, children, config },
    edit,
    offset
  ) {
    const index = keyPosition(BitField.popcount(datamap, 0, offset))

    return new BitmapIndexedNode(
      edit,
      BitField.unset(datamap.slice(), offset),
      nodemap.slice(),

      [...children.slice(0, index), ...children.slice(index + 2)],
      config
    )
  }

  /**
   * @template T
   * @template {string} K
   * @param {BitmapIndexedNode<T, K>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @param {BitmapIndexedNode<T, K>} child
   * @returns {BitmapIndexedNode<T, K>}
   */

  static copyAndMigrateToInline(node, edit, offset, child) {
    const { datamap, nodemap } = node
    const oldIndex = nodePosition(node, offset)
    const newIndex = keyPosition(BitField.popcount(datamap, 0, offset))
    const children = node.children.slice()

    // remove the node that we are inlining
    children.splice(oldIndex, 1)
    // add key-value pair where it wolud fall
    children.splice(newIndex, 0, child.children[0], child.children[1])

    return new BitmapIndexedNode(
      edit,
      BitField.set(datamap.slice(), offset),
      BitField.unset(nodemap.slice(), offset),
      children,
      node.config
    )
  }

  /**
   * @param {API.Edit|null} edit
   * @return {BitmapIndexedNode<T, K>}
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
   * @param {BitmapIndexedNode<T, K>} node
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
   * @param {BitmapIndexedNode<T, K>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @param {API.BitmapIndexedNode<T, K>} child
   */
  static copyAndSetChild(node, edit, offset, child) {
    const fork = node.fork(edit)
    fork.children[nodePosition(node, offset)] = child
    return fork
  }

  /**
   * @template T
   * @template {string} K
   * @param {BitmapIndexedNode<T, K>} node
   * @param {API.Edit|null} edit
   * @param {number} offset
   * @param {BitmapIndexedNode<T, K>} child
   */
  static copyAndMigrateToNode(node, edit, offset, child) {
    const { nodemap, datamap, config, children } = node
    const index = BitField.popcount(datamap, 0, offset)
    // Previous id corresponds to the key position
    const oldId = keyPosition(index)
    const newId = nodePosition(node, offset)

    return new BitmapIndexedNode(
      edit,
      // datamap without old child offset off
      BitField.unset(datamap.slice(), offset),
      // nodemap with new nodes bit set
      BitField.set(nodemap.slice(), offset),
      /** @type {API.Children<T, K>} */
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
   * @param {API.Config} config
   * @param {API.Edit|null} edit
   * @param {number} shift
   * @param {Uint8Array} oldHash
   * @param {K} oldKey
   * @param {T} oldValue
   * @param {Uint8Array} newHash
   * @param {K} newKey
   * @param {T} newValue
   * @returns {BitmapIndexedNode<T, K>}
   */
  static mergeTwoPairs(
    config,
    edit,
    shift,
    oldHash,
    oldKey,
    oldValue,
    newHash,
    newKey,
    newValue
  ) {
    const depth = shift / config.bitWidth
    const oldId = Hash.read(oldHash, depth, config)
    const newId = Hash.read(newHash, depth, config)

    // If hashes still match create another intermediery node and merge these
    // two nodes at next depth level.
    if (oldId === newId) {
      return new BitmapIndexedNode(
        edit,
        createBitField(config),
        BitField.set(createBitField(config), oldId),
        [
          BitmapIndexedNode.mergeTwoPairs(
            config,
            edit,
            incShift(config, shift),
            oldHash,
            oldKey,
            oldValue,
            newHash,
            newKey,
            newValue
          ),
        ],
        config
      )
    }
    // otherwise create new node with both key-value pairs as it's children
    else {
      const nodemap = createBitField(config)
      const datamap = createBitField(config)
      BitField.set(datamap, oldId)
      BitField.set(datamap, newId)
      // We insert child with a lower index first so that we can derive it's
      // index on access via popcount
      /** @type {API.Children<T, K>} */
      const children =
        oldId < newId
          ? [oldKey, oldValue, newKey, newKey]
          : [newKey, newKey, oldKey, oldValue]

      return new BitmapIndexedNode(edit, datamap, nodemap, children, config)
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
      const node = /** @type {API.BitmapIndexedNode<T, K>} */ (children[offset])
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
      const node = /** @type {API.BitmapIndexedNode<T, K>} */ (children[offset])
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
      const node = /** @type {API.BitmapIndexedNode<T, K>} */ (children[offset])
      yield* node.values()
      offset += 1
    }
  }
}

/**
 * @param {API.BitmapIndexedNode} node
 */
const hasSingleEntry = node => node.nodeArity === 0 && node.dataArity === 1

/**
 * @param {API.Config} config
 */
const createBitField = config => BitField.create(Math.pow(2, config.bitWidth))

/**
 * @template T
 * @template {string} K
 * @param {API.BitmapIndexedNode<T, K>} node
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
 * @param {API.BitmapIndexedNode<T, K>} node
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
 * @param {API.BitmapIndexedNode<T, K>} node
 * @param {number} offset
 */
export const resolveNode = (node, offset) =>
  /** @type {API.BitmapIndexedNode<T, K>} */ (
    node.children[nodePosition(node, offset)]
  )

/**
 * @param {API.BitmapIndexedNode} node
 * @param {number} offset
 */
const nodePosition = ({ children, nodemap }, offset) =>
  children.length - 1 - BitField.popcount(nodemap, 0, offset)

/**
 *
 * @param {API.Config} config
 * @param {API.Uint32} shift
 */
const incShift = (config, shift) => shift + config.bitWidth

/**
 * @template T
 * @template {string} K
 */
class PersistentHashMap {
  /**
   *
   * @param {number} count
   * @param {API.BitmapIndexedNode<T, K>} root
   * @param {Hash.Config} config
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
  clone() {
    return new PersistentHashMap(this.count, this.root, this.config)
  }
  empty() {
    return new PersistentHashMap(0, this.root.empty(), this.config)
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    return this.root.lookup(0, utf8.encode(key), key, notFound) !== notFound
  }
  /**
   * @param {K} key
   * @returns {T|undefined}
   */
  get(key) {
    return this.root.lookup(0, utf8.encode(key), key, undefined)
  }
  /**
   * @template {string} R
   * @param {R} key
   * @param {T} value
   * @returns {PersistentHashMap<T, K|R>}
   */
  set(key, value) {
    const addedLeaf = { value: false }
    const root = this.root.associate(
      null,
      0,
      utf8.encode(key),
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
   */
  delete(key) {
    const root = this.root.dissociate(null, 0, utf8.encode(key), key, {
      value: false,
    })
    if (root === this.root) {
      return this
    } else {
      return new PersistentHashMap(this.count - 1, root, this.config)
    }
  }

  get bitField() {
    // @ts-ignore
    return BitField.or(this.root.datamap, this.root.nodemap)
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

  createBuilder() {
    return new HashMapBuilder({}, this.count, this.root, this.config)
  }
}

/**
 * @template T
 * @template {string} K
 */
class HashMapBuilder {
  /**
   * @param {API.Edit} edit
   * @param {number} count
   * @param {API.BitmapIndexedNode<T, K>} root
   * @param {Hash.Config} config
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
   * @returns {HashMapBuilder<T, K|R>}
   */
  set(key, value) {
    if (this.edit) {
      const addedLeaf = { value: false }
      const root = this.root.associate(
        this.edit,
        0,
        utf8.encode(key),
        key,
        value,
        addedLeaf
      )

      if (this.root !== root) {
        this.root = /** @type {API.BitmapIndexedNode<T, K>} */ (root)
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
      const root = this.root.dissociate(
        this.edit,
        0,
        utf8.encode(key),
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
 * @param {API.Config} config
 * @returns {PersistentHashMap<T, K>}
 */
export const create = config =>
  new PersistentHashMap(0, BitmapIndexedNode.withConfig(config, null), config)

/**
 * @template {string} K
 * @template T
 * @param {API.Config} config
 * @returns {HashMapBuilder<T, K>}
 */
export const createBuilder = config => {
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
