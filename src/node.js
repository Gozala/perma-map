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
   * @param {API.Edit|null} edit
   * @param {ReturnType<C['bitfield']['create']>} datamap
   * @param {ReturnType<C['bitfield']['create']>} nodemap
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
    return this.config.bitfield.popcount(this.nodemap)
  }
  get dataArity() {
    return this.config.bitfield.popcount(this.datamap)
  }

  /**
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  empty() {
    return create(this.config)
  }

  /**
   * @template X
   * @param {API.Uint32} shift
   * @param {ReturnType<C['hash']['create']>} key
   * @param {K} name
   * @param {X} notFound
   * @returns {T|X}
   */

  lookup(shift, key, name, notFound) {
    return lookup(this, shift, key, name, notFound)
  }

  /**
   * @template {string} R
   * @param {API.Edit|null} edit
   * @param {API.Uint32} shift
   * @param {ReturnType<C['hash']['create']>} key
   * @param {K|R} name
   * @param {T} value
   * @param {{value:boolean}} addedLeaf
   * @returns {API.BitmapIndexedNode<T, K | R>}
   */
  associate(edit, shift, key, name, value, addedLeaf) {
    return associate(this, edit, shift, key, name, value, addedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @param {API.Uint32} shift
   * @param {ReturnType<C['hash']['create']>} key
   * @param {K} name
   * @param {{value:boolean}} removedLeaf
   * @returns {API.Node<T, K, C>}
   */
  dissociate(edit, shift, key, name, removedLeaf) {
    return dissociate(this, edit, shift, key, name, removedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @returns {this}
   */
  fork(edit = null) {
    return /** @type {this} */ (fork(this, edit))
  }

  /**
   * @returns {IterableIterator<[K, T]>}
   */
  entries() {
    return entries(this)
  }

  /**
   * @returns {IterableIterator<K>}
   */
  keys() {
    return keys(this)
  }

  /**
   * @returns {IterableIterator<T>}
   */
  values() {
    return values(this)
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @implements {API.HashCollisionNode<T, K, C>}
 */
class HashCollisionNode {
  /**
   * @param {API.Edit|null} edit
   * @param {number} count
   * @param {API.CollisionEntries<T, K>} children
   * @param {C} config
   */
  constructor(edit, count, children, config) {
    this.edit = edit
    this.count = count
    this.children = children
    this.config = config
  }
  get nodeArity() {
    return /** @type {0} */ (0)
  }
  get dataArity() {
    return this.count
  }

  /**
   * @template X
   * @param {API.Uint32} _shift
   * @param {unknown} _key
   * @param {K} name
   * @param {X} notFound
   * @returns {T|X}
   */
  lookup(_shift, _key, name, notFound) {
    return lookupCollision(this, name, notFound)
  }

  /**
   * @template {string} R
   * @param {API.Edit|null} edit
   * @param {API.Uint32} _shift
   * @param {ReturnType<C['hash']['create']>} key
   * @param {K|R} name
   * @param {T} value
   * @param {{value:boolean}} addedLeaf
   * @returns {API.HashCollisionNode<T, K | R, C>}
   */
  associate(edit, _shift, key, name, value, addedLeaf) {
    return associateCollision(this, edit, key, name, value, addedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @param {API.Uint32} _shift
   * @param {ReturnType<C['hash']['create']>} hash
   * @param {K} name
   * @param {{value:boolean}} removedLeaf
   * @returns {API.Node<T, K, C>}
   */
  dissociate(edit, _shift, hash, name, removedLeaf) {
    return dissociateollision(this, edit, hash, name, removedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @returns {this}
   */
  fork(edit = null) {
    return /** @type {this} */ (forkCollision(this, edit))
  }

  /**
   * @returns {IterableIterator<[K, T]>}
   */
  entries() {
    return entries(this)
  }

  /**
   * @returns {IterableIterator<K>}
   */
  keys() {
    return keys(this)
  }

  /**
   * @returns {IterableIterator<T>}
   */
  values() {
    return values(this)
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @template X
 * @param {API.HashCollisionNode<T, K, C>} node
 * @param {K} name
 * @param {X} notFound
 * @returns {T|X}
 */
export const lookupCollision = (node, name, notFound) => {
  const { children: entries, count } = node
  // find where entry with this name belongs
  const n = findHashCollisionNodeIndex(entries, count, name)
  // if entry name at this index matches given name return the value otherwise
  // return `notFound` as we have no such entry.
  return entries[n] === name ? /** @type {T} */ (entries[n + 1]) : notFound
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @template {string} R
 * @param {API.HashCollisionNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {ReturnType<C['hash']['create']>} key
 * @param {K|R} name
 * @param {T} value
 * @param {{value:boolean}} addedLeaf
 * @returns {API.HashCollisionNode<T, K | R, C>}
 */
export const associateCollision = (node, edit, key, name, value, addedLeaf) => {
  const { children, count } = node

  const index = findHashCollisionNodeIndex(children, count, name)
  // If entry at this index has a different name we fork the node and
  // add a new entry.
  if (children[index] !== name) {
    const newNode = node.fork(edit)
    addedLeaf.value = true
    newNode.count += 1
    newNode.children.splice(index, key, value)
    return newNode
  }
  // If name is the same but value is not we fork the node and update
  // the value
  else if (children[index + 1] !== value) {
    const newNode = node.fork(edit)
    newNode.children[index + 1] = value
    return newNode
  }
  // If we got this far entry with this exact name and value is already
  // present making this a noop, so we return this node back.
  else {
    return node
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.HashCollisionNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {ReturnType<C['hash']['create']>} hash
 * @param {K} name
 * @param {{value:boolean}} removedLeaf
 * @returns {API.Node<T, K, C>}
 */
export const dissociateollision = (node, edit, hash, name, removedLeaf) => {
  const { children: entries, count, config } = node
  const index = findHashCollisionNodeIndex(entries, count, name)
  // If there is no entry with a the given name this is noop so we just
  // return back this node.
  if (entries[index] !== name) {
    return node
  } else {
    removedLeaf.value = true
    // If conflict contained only two entries removing one of them would
    // leave us with no conflict which is why we create a new node with a
    // an entry other than one that would correspond provided name
    if (count === 2) {
      const offset = index === 0 ? 2 : 0
      return /** @type {API.BitmapIndexedNode<T, K, C>} */ (
        associate(
          create(config, edit),
          edit,
          0,
          hash,
          /** @type {K} */ (entries[offset]),
          /** @type {T} */ (entries[offset + 1]),
          removedLeaf
        )
      )
    }
    // otherwise we got this far we have more than two colliding entries in
    // which case we simply remove one corresponding to given `name`.
    //
    else {
      const newNode = node.fork(edit)
      newNode.children.splice(index, 2)
      newNode.count -= 1
      return newNode
    }
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.HashCollisionNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @returns {API.HashCollisionNode<T, K, C>}
 */
export const forkCollision = (node, edit = null) => {
  if (canEdit(node.edit, edit)) {
    return node
  } else {
    return new HashCollisionNode(
      edit,
      node.count,
      /** @type {API.CollisionEntries<T, K>} */ (node.children.slice()),
      node.config
    )
  }
}

/**
 * Finds the index inside collision entries where given `key` belongs, which is
 * index where `key <= entries[index]` is `true`. If no index satisfies this
 * constraint index will be `entries.length` indicating that key belongs in the
 * last position.
 *
 * @template T
 * @template {string} K
 * @param {API.CollisionEntries<T, K>} entries
 * @param {number} count
 * @param {K} key
 */
const findHashCollisionNodeIndex = (entries, count, key) => {
  let index = 0
  // increase index until we find a index where key <= entries[index]
  while (index < count && entries[index] > key) {
    index += 2
  }
  return index
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {C} config
 * @param {API.Edit|null} edit
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
export const create = (config, edit = null) =>
  new BitmapIndexedNode(
    edit,
    config.bitfield.create(),
    config.bitfield.create(),
    /** @type {API.Children<T, K, C>} */ ([]),
    config
  )

/**
 * @template T, U
 * @template {string} K
 * @template Bits, BitMap
 * @param {API.BitmapIndexedNode<T, K, API.Config<Bits, BitMap>>} node
 * @param {API.Uint32} shift
 * @param {Bits} key
 * @param {K} name
 * @param {U} notFound
 * @returns {T|U}
 */
export const lookup = (node, shift, key, name, notFound) => {
  const { datamap, nodemap, config } = node
  const { bitWidth, hash, bitfield } = config
  const offset = hash.slice(key, shift, shift + bitWidth)

  // If bit is set in the data bitmap we have some key, value under the
  // matching hash segment.
  if (bitfield.get(datamap, offset)) {
    const index = bitfield.popcount(datamap, offset)
    // If key matches actual key in the map we found the the value
    // otherwise we did not.
    if (keyAt(node, index) === name) {
      return valueAt(node, index)
    } else {
      return notFound
    }
  }
  // If bit is set in the node bitmapt we have a node under the
  // matching hash segment.
  else if (bitfield.get(nodemap, offset)) {
    // Resolve node and continue lookup within it.
    const child = resolveNode(node, offset)
    return child.lookup(incShift(config, shift), key, name, notFound)
  }
  // If we have neither node nor key-pair for this hash segment
  // we return notFound.
  else {
    return notFound
  }
}

/**
 * @template T
 * @template {string} K
 * @template {string} R
 * @template Bits, BitMap
 * @param {API.BitmapIndexedNode<T, K, API.Config<Bits, BitMap>>} node
 * @param {API.Edit|null} edit
 * @param {API.Uint32} shift
 * @param {Bits} key
 * @param {K|R} name
 * @param {T} value
 * @param {{value:boolean}} addedLeaf
 * @returns {API.BitmapIndexedNode<T, K | R, API.Config<Bits, BitMap>>}
 */
export const associate = (node, edit, shift, key, name, value, addedLeaf) => {
  const { datamap, nodemap, children, config } = node
  const { hash, bitfield } = config
  const offset = hash.slice(key, shift, incShift(config, shift))
  // If bit is set in the data bitmap we have some key, value under the
  // matching hash segment.
  if (bitfield.get(datamap, offset)) {
    const index = bitfield.popcount(datamap, offset)
    const found = keyAt(node, index)
    // If we have entry with given name and value is the same return node
    // as is, otherwise fork node and set the value.
    if (name === found) {
      return valueAt(node, index) === value
        ? node
        : forkAndSet(node, edit, index, value)
    }
    // Otherwise we need to create a branch to contain current key, value and
    // one been passed.
    else {
      const branch = mergeTwoLeaves(
        config,
        edit,
        incShift(config, shift),
        hash.create(utf8.encode(found)),
        found,
        valueAt(node, index),
        key,
        name,
        value
      )
      addedLeaf.value = true

      return migrateLeafToBranch(node, edit, offset, branch)
    }
  }
  // If bit is set in the node bitmapt we have a branch under the current
  // hash slice.
  else if (bitfield.get(nodemap, offset)) {
    const child = resolveNode(node, offset)
    const newChild = associate(
      node,
      edit,
      incShift(config, shift),
      key,
      name,
      value,
      addedLeaf
    )

    if (child === newChild) {
      return node
    } else {
      return copyAndSetChild(node, edit, offset, newChild)
    }
  }
  // If we have neither node nor a key-value for this hash segment. We copy
  // current children and add new key-value pair
  else {
    const index = bitfield.popcount(datamap, offset)
    const position = keyPosition(index)
    addedLeaf.value = true

    const newNode =
      /** @type {API.BitmapIndexedNode<T, K|R, API.Config<Bits, BitMap>>} */ (
        node.fork(edit)
      )
    // Capture new entry in the data bitmap
    newNode.datamap = bitfield.set(datamap, offset)
    newNode.children.splice(position, 0, name, value)
    return newNode
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {API.Uint32} shift
 * @param {ReturnType<C['hash']['create']>} key
 * @param {K} name
 * @param {{value:boolean}} removedLeaf
 * @returns {API.Node<T, K, C>}
 */
export const dissociate = (node, edit, shift, key, name, removedLeaf) => {
  const { datamap, nodemap, config } = node
  const { bitfield, hash } = config
  const offset = hash.slice(key, shift, incShift(config, shift))
  // If bit is set in the data bitmap we have an entry under the
  // matching hash segment.
  if (bitfield.get(datamap, offset)) {
    const index = bitfield.popcount(datamap, offset)
    // If key at a given index matches given `name` we fork a node and remove
    // relevant entry
    if (keyAt(node, index) === name) {
      removedLeaf.value = true
      const newNode = node.fork(edit)
      newNode.datamap = bitfield.unset(datamap, offset)
      newNode.children.splice(index, 2)
      return newNode
    }
    // otherwise we don't have such entry so we return node back as is.
    else {
      return node
    }
  }
  // If bit is set in the node bitmapt we have a node under the
  // matching hash segment.
  else if (bitfield.get(nodemap, offset)) {
    const child = resolveNode(node, offset)
    const newChild = child.dissociate(
      edit,
      incShift(config, shift),
      key,
      name,
      removedLeaf
    )
    if (child === newChild) {
      return node
    } else {
      if (hasSingleEntry(newChild)) {
        if (
          bitfield.popcount(datamap) === 0 &&
          bitfield.popcount(nodemap) === 1
        ) {
          return newChild
        } else {
          return copyAndMigrateToInline(node, edit, offset, newChild)
        }
      } else {
        return copyAndSetChild(node, edit, offset, newChild)
      }
    }
  }
  // If we have neither node nor a key-value for this hash segment this is a
  // noop.
  else {
    return node
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.Node<T, K, C>} node
 * @returns {IterableIterator<[K, T]>}
 */
export const entries = function* ({ children }) {
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
    const node = /** @type {API.BitmapIndexedNode<T, K, C>} */ (
      children[offset]
    )
    yield* node.entries()
    offset += 1
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
export const fork = (node, edit) => {
  if (canEdit(node.edit, edit)) {
    return node
  } else {
    const newNode = new BitmapIndexedNode(
      edit,
      node.datamap,
      node.nodemap,
      node.children.slice(),
      node.config
    )
    return newNode
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.Node<T, K, C>} node
 * @returns {IterableIterator<K>}
 */
export const keys = function* ({ children }) {
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

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.Node<T, K, C>} node
 * @returns {IterableIterator<T>}
 */
export const values = function* ({ children }) {
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

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {number} offset
 * @param {T} value
 */
export const forkAndSet = (node, edit, offset, value) => {
  const newNode = node.fork(edit)
  newNode.children[valuePosition(offset)] = value
  return newNode
}

/**
 * @template T, U
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {number} offset
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
export const copyAndRemoveValue = (
  { datamap, nodemap, children, config },
  edit,
  offset
) => {
  const { bitfield, hash } = config
  const index = keyPosition(bitfield.popcount(datamap, offset))

  return new BitmapIndexedNode(
    edit,
    bitfield.unset(datamap, offset),
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
export const copyAndMigrateToInline = (node, edit, offset, child) => {
  const { datamap, nodemap, config } = node
  const { bitfield } = config
  const oldIndex = nodePosition(node, offset)
  const newIndex = keyPosition(node.config.bitfield.popcount(datamap, offset))
  const children = node.children.slice()

  // remove the node that we are inlining
  children.splice(oldIndex, 1)
  // add key-value pair where it wolud fall
  children.splice(newIndex, 0, child.children[0], child.children[1])

  return new BitmapIndexedNode(
    edit,
    bitfield.set(datamap.slice(), offset),
    bitfield.unset(nodemap.slice(), offset),
    children,
    node.config
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
export const copyAndSetChild = (node, edit, offset, child) => {
  const newNode = node.fork(edit)
  newNode.children[nodePosition(node, offset)] = child
  return newNode
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} source
 * @param {API.Edit|null} edit
 * @param {number} offset
 * @param {API.Node<T, K, C>} branch
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
export const migrateLeafToBranch = (source, edit, offset, branch) => {
  const { nodemap, datamap, config } = source
  const { bitfield } = config
  const index = bitfield.popcount(datamap, offset)
  // Previous id corresponds to the key position
  const oldId = keyPosition(index)
  const newId = nodePosition(source, offset)

  const node = source.fork(edit)

  // add a new branch
  node.nodemap = bitfield.unset(nodemap, offset)
  node.children.splice(newId, 0, branch)

  // remove an old leaf
  node.datamap = bitfield.unset(datamap, offset)
  node.children.splice(oldId, 2)

  return node
}

/**
 * @template T
 * @template {string} K
 * @template Bits, BitMap
 * @param {API.Config<Bits, BitMap>} config
 * @param {API.Edit|null} edit
 * @param {number} shift
 * @param {Bits} oldHash
 * @param {K} oldKey
 * @param {T} oldValue
 * @param {Bits} newHash
 * @param {K} newKey
 * @param {T} newValue
 * @returns {API.Node<T, K, API.Config<Bits, BitMap>>}
 */
export const mergeTwoLeaves = (
  config,
  edit,
  shift,
  oldHash,
  oldKey,
  oldValue,
  newHash,
  newKey,
  newValue
) => {
  const { bitfield, hash } = config
  const nextShift = incShift(config, shift)
  const newId = hash.slice(newHash, shift, nextShift)
  const oldId = hash.slice(oldHash, shift, nextShift)
  // If we have no more bits to read of hash we can not create another
  // BitmapIndexedNode so instead we create a node containing (hash) colliding
  // entries
  if (newId === oldId) {
    if (nextShift >= hash.size) {
      return new HashCollisionNode(
        edit,
        2,
        [oldKey, oldValue, newKey, newValue],
        config
      )
    }
    // If hashes still match create another intermediery node and merge these
    // two nodes at next depth level.
    else {
      return new BitmapIndexedNode(
        edit,
        bitfield.create(),
        bitfield.set(bitfield.create(), oldId),
        [
          mergeTwoLeaves(
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
  }
  // otherwise create new node with both key-value pairs as it's children
  else {
    return new BitmapIndexedNode(
      edit,
      bitfield.set(bitfield.set(bitfield.create(), oldId), newId),
      bitfield.create(),
      /** @type {API.Children<T, K, API.Config<Bits, BitMap>>} */
      (
        // We insert child with a lower index first so that we can derive it's
        // index on access via popcount
        oldId < newId
          ? [oldKey, oldValue, newKey, newKey]
          : [newKey, newKey, oldKey, oldValue]
      ),
      config
    )
  }
}

/**
 * @template {string} K
 * @param {API.BitmapIndexedNode<unknown, K>} node
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
 * @param {API.BitmapIndexedNode<T>} node
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
 * @returns {API.BitmapIndexedNode<T, K, C>|API.HashCollisionNode<T, K, C>}
 */
export const resolveNode = (node, offset) =>
  /** @type {API.BitmapIndexedNode<T, K, C>|API.HashCollisionNode<T, K, C>} */ (
    node.children[nodePosition(node, offset)]
  )

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {number} offset
 */
const nodePosition = ({ children, nodemap, config }, offset) =>
  children.length - 1 - config.bitfield.popcount(nodemap, offset)

/**
 * @param {API.Config} config
 * @param {API.Uint32} shift
 */
const incShift = (config, shift) => shift + config.bitWidth

/**
 * @param {API.Edit|null} owner
 * @param {API.Edit|null} editor
 */
const canEdit = (owner, editor) => owner != null && owner === editor

/**
 * @param {API.Node} node
 */
const hasSingleEntry = node => node.nodeArity === 0 && node.dataArity === 1
