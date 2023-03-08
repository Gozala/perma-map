import * as API from "./api.js"
export * from "./api.js"
import * as BitField from "./bitfield/Uint32.js"
import * as Path from "./path/Uint32.js"
export { API }

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @implements {API.BitmapIndexedNode<T, K, C>}
 */
class BitmapIndexedNode {
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
  /* c8 ignore next 3 */
  empty() {
    return create(this.config)
  }

  /**
   * @template X
   * @param {API.Uint32} depth
   * @param {ReturnType<C['Path']['from']>} path
   * @param {K} key
   * @param {X} notFound
   * @returns {T|X}
   */

  lookup(depth, path, key, notFound) {
    return lookup(this, depth, path, key, notFound)
  }

  /**
   * @template {string} R
   * @param {API.Edit|null} edit
   * @param {API.Uint32} depth
   * @param {ReturnType<C['Path']['from']>} path
   * @param {K|R} key
   * @param {T} value
   * @param {{value:boolean}} addedLeaf
   * @returns {API.BitmapIndexedNode<T, K | R, C>}
   */
  associate(edit, depth, path, key, value, addedLeaf) {
    return associate(this, edit, depth, path, key, value, addedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @param {API.Uint32} depth
   * @param {ReturnType<C['Path']['from']>} path
   * @param {K} key
   * @param {{value:boolean}} removedLeaf
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  dissociate(edit, depth, path, key, removedLeaf) {
    return dissociate(this, edit, depth, path, key, removedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @returns {API.BitmapIndexedNode<T, K, C>}
   */
  fork(edit = null) {
    return fork(this, edit)
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
  /* c8 ignore next 12 */
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
   * @param {unknown} _path
   * @param {K} key
   * @param {X} notFound
   * @returns {T|X}
   */
  /* c8 ignore next 3 */
  lookup(_shift, _path, key, notFound) {
    return lookupCollision(this, key, notFound)
  }

  /**
   * @template {string} R
   * @param {API.Edit|null} edit
   * @param {API.Uint32} _shift
   * @param {ReturnType<C['Path']['from']>} path
   * @param {K|R} key
   * @param {T} value
   * @param {{value:boolean}} addedLeaf
   * @returns {API.HashCollisionNode<T, K | R, C>}
   */
  /* c8 ignore next 3 */
  associate(edit, _shift, path, key, value, addedLeaf) {
    return associateCollision(this, edit, path, key, value, addedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @param {API.Uint32} _shift
   * @param {ReturnType<C['Path']['from']>} path
   * @param {K} key
   * @param {{value:boolean}} removedLeaf
   * @returns {API.Node<T, K, C>}
   */
  /* c8 ignore next 3 */
  dissociate(edit, _shift, path, key, removedLeaf) {
    return dissociateCollision(this, edit, path, key, removedLeaf)
  }

  /**
   * @param {API.Edit|null} edit
   * @returns {this}
   */
  /* c8 ignore next 3 */
  fork(edit = null) {
    return /** @type {this} */ (forkCollision(this, edit))
  }

  /**
   * @returns {IterableIterator<[K, T]>}
   */
  /* c8 ignore next 3 */
  entries() {
    return entries(this)
  }

  /**
   * @returns {IterableIterator<K>}
   */
  /* c8 ignore next 3 */
  keys() {
    return keys(this)
  }

  /**
   * @returns {IterableIterator<T>}
   */
  /* c8 ignore next 3 */
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
/* c8 ignore next 8 */
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
 * @param {ReturnType<C['Path']['from']>} key
 * @param {K|R} name
 * @param {T} value
 * @param {{value:boolean}} addedLeaf
 * @returns {API.HashCollisionNode<T, K | R, C>}
 */
/* c8 ignore next 26 */
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
 * @param {ReturnType<C['Path']['from']>} hash
 * @param {K} name
 * @param {{value:boolean}} removedLeaf
 * @returns {API.Node<T, K, C>}
 */
/* c8 ignore next 37 */
export const dissociateCollision = (node, edit, hash, name, removedLeaf) => {
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
          create(config),
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
/* c8 ignore next 12 */
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
/* c8 ignore next 8 */
const findHashCollisionNodeIndex = (entries, count, key) => {
  let index = 0
  // increase index until we find a index where key <= entries[index]
  while (index < count && entries[index] > key) {
    index += 2
  }
  return index
}

const defaultConfig = { bitWidth: 32, BitField, Path }
/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.Edit|null} [edit]
 * @param {C} config
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
export const create = (config, edit = null) =>
  new BitmapIndexedNode(
    edit,
    config.BitField.empty(Math.pow(2, config.bitWidth)),
    config.BitField.empty(Math.pow(2, config.bitWidth)),
    /** @type {API.Children<T, K, C>} */ ([]),
    config
  )

/**
 * @template T, U
 * @template {string} K
 * @param {API.BitmapIndexedNode<T, K>} node
 * @param {K} key
 * @param {U} notFound
 */
export const get = (node, key, notFound) =>
  lookup(node, 0, node.config.Path.from(key), key, notFound)

/**
 * @template T, U
 * @template {string} K
 * @template Bits, BitMap
 * @param {API.BitmapIndexedNode<T, K, API.Config<Bits, BitMap>>} node
 * @param {API.Uint32} depth
 * @param {Bits} path
 * @param {K} key
 * @param {U} notFound
 * @returns {T|U}
 */
export const lookup = (node, depth, path, key, notFound) => {
  const { datamap, nodemap, config } = node
  const { Path, BitField } = config
  const offset = Path.at(path, depth)

  // If bit is set in the data bitmap we have some key, value under the
  // matching hash segment.
  if (BitField.get(datamap, offset)) {
    const index = BitField.popcount(datamap, offset)
    // If key matches actual key in the map we found the the value
    // otherwise we did not.
    if (keyAt(node, index) === key) {
      return valueAt(node, index)
    } else {
      return notFound
    }
  }
  // If bit is set in the node bitmapt we have a node under the
  // matching hash segment.
  else if (BitField.get(nodemap, offset)) {
    // Resolve node and continue lookup within it.
    const child = resolveNode(node, offset)
    return child.lookup(depth + 1, path, key, notFound)
  }
  // If we have neither node nor key-pair for this hash segment
  // we return notFound.
  else {
    return notFound
  }
}

/**
 * @template T, U
 * @template {string} K
 * @template {string} R
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {R} key
 * @param {T} value
 * @param {{ value: boolean }} addedLeaf
 * @returns {API.BitmapIndexedNode<T, K|R, C>}
 */
export const set = (node, edit, key, value, addedLeaf) =>
  associate(node, edit, 0, node.config.Path.from(key), key, value, addedLeaf)

/**
 * @template T
 * @template {string} K
 * @template {string} R
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {API.Uint32} depth
 * @param {ReturnType<C['Path']['from']>} path
 * @param {K|R} key
 * @param {T} value
 * @param {{value:boolean}} addedLeaf
 * @returns {API.BitmapIndexedNode<T, K | R, C>}
 */
export const associate = (node, edit, depth, path, key, value, addedLeaf) => {
  const { datamap, nodemap, config } = node
  const { Path, BitField } = config
  const offset = Path.at(path, depth)
  // If bit is set in the data bitmap we have some key, value under the
  // matching hash segment.
  if (BitField.get(datamap, offset)) {
    const index = BitField.popcount(datamap, offset)
    const found = keyAt(node, index)
    // If we have entry with given name and value is the same return node
    // as is, otherwise fork node and set the value.
    if (key === found) {
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
        depth + 1,
        Path.from(found),
        found,
        valueAt(node, index),
        path,
        key,
        value
      )
      addedLeaf.value = true

      return migrateLeafToBranch(node, edit, offset, branch)
    }
  }
  // If bit is set in the node bitmap we have a branch under the current
  // hash slice.
  else if (BitField.get(nodemap, offset)) {
    const child = resolveNode(node, offset)
    const newChild = child.associate(
      edit,
      depth + 1,
      path,
      key,
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
    const index = BitField.popcount(datamap, offset)
    addedLeaf.value = true

    /** @type {API.BitmapIndexedNode<T, K|R, C>} */
    const newNode = node.fork(edit)

    // Capture new entry in the data bitmap
    newNode.datamap = BitField.set(datamap, offset)
    newNode.children.splice(keyPosition(index), 0, key, value)
    return newNode
  }
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @param {API.Edit|null} edit
 * @param {K} key
 * @param {{ value: boolean }} removedLeaf
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
const remove = (node, edit, key, removedLeaf) =>
  dissociate(node, edit, 0, node.config.Path.from(key), key, removedLeaf)

export { remove as delete }

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} source
 * @param {API.Edit|null} edit
 * @param {API.Uint32} depth
 * @param {ReturnType<C['Path']['from']>} path
 * @param {K} key
 * @param {{value:boolean}} removedLeaf
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
export const dissociate = (source, edit, depth, path, key, removedLeaf) => {
  const { datamap, nodemap, config } = source
  const { BitField, Path } = config
  const offset = Path.at(path, depth)
  // If bit is set in the data bitmap we have an entry under the
  // matching hash segment.
  if (BitField.get(datamap, offset)) {
    const index = BitField.popcount(datamap, offset)
    // If key at a given index matches given `name` we fork a node and remove
    // the entry
    if (key === keyAt(source, index)) {
      removedLeaf.value = true
      const node = fork(source, edit)
      // Update the bitmap
      node.datamap = BitField.unset(source.datamap, offset)
      // remove the child
      node.children.splice(keyPosition(index), 2)
      return node
    }
    // otherwise we don't have such entry so we return node back as is.
    else {
      return source
    }
  }
  // If bit is set in the node bitmapt we have a node under the
  // matching hash segment.
  else if (BitField.get(nodemap, offset)) {
    const node = resolveNode(source, offset)
    const child = node.dissociate(edit, depth + 1, path, key, removedLeaf)
    // if child has a single element we need to canonicalize
    if (hasSingleLeaf(child)) {
      // if source has a single child, we collapse and return the child
      // otherwise we inline the child.
      return hasSingleNode(source)
        ? child
        : inlineChild(source, edit, offset, child)
    } else if (node === child) {
      return source
    } else {
      return copyAndSetChild(source, edit, offset, child)
    }
  }
  // If we have neither node nor a key-value for this hash segment this is a
  // noop.
  else {
    return source
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
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} source
 * @param {API.Edit|null} edit
 * @param {number} offset
 * @param {API.Node<T, K, C>} child
 * @returns {API.BitmapIndexedNode<T, K, C>}
 */
export const inlineChild = (source, edit, offset, child) => {
  const { datamap, nodemap, config } = source
  const { BitField } = config
  const node = fork(source, edit)

  // remove the node that we are inlining
  node.children.splice(nodePosition(source, offset), 1)
  // add key-value pair where it wolud fall
  node.children.splice(
    keyPosition(BitField.popcount(datamap, offset)),
    0,
    child.children[0],
    child.children[1]
  )

  node.datamap = BitField.set(datamap, offset)
  node.nodemap = BitField.unset(nodemap, offset)

  return node
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
  const newNode = fork(node, edit)
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
  const { BitField } = config
  const index = BitField.popcount(datamap, offset)
  // Previous id corresponds to the key position
  const oldId = keyPosition(index)
  const newId = nodePosition(source, offset)

  const node = fork(source, edit)

  // remove an old leaf
  node.datamap = BitField.unset(datamap, offset)
  node.children.splice(oldId, 2)

  // add a new branch
  node.nodemap = BitField.set(nodemap, offset)
  node.children.splice(newId - 1, 0, branch)

  return node
}

/**
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {C} config
 * @param {API.Edit|null} edit
 * @param {number} depth
 * @param {ReturnType<C['Path']['from']>} oldPath
 * @param {K} oldKey
 * @param {T} oldValue
 * @param {ReturnType<C['Path']['from']>} newPath
 * @param {K} newKey
 * @param {T} newValue
 * @returns {API.Node<T, K, C>}
 */
export const mergeTwoLeaves = (
  config,
  edit,
  depth,
  oldPath,
  oldKey,
  oldValue,
  newPath,
  newKey,
  newValue
) => {
  const { BitField, Path } = config
  // If we have reached end of the path we can no longer create another
  // `BitmapIndexedNode`, instead we create a node containing (hash) colliding
  // entries
  /* c8 ignore next 7 */
  if (Path.size < depth) {
    return new HashCollisionNode(
      edit,
      2,
      [oldKey, oldValue, newKey, newValue],
      config
    )
  } else {
    const oldOffset = Path.at(oldPath, depth)
    const newOffset = Path.at(newPath, depth)
    // If offsets still match create another intermediery node and merge these
    // two nodes at next depth level.
    if (oldOffset === newOffset) {
      return new BitmapIndexedNode(
        edit,
        BitField.empty(Math.pow(2, config.bitWidth)),
        BitField.from([oldOffset], Math.pow(2, config.bitWidth)),
        [
          mergeTwoLeaves(
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
      return new BitmapIndexedNode(
        edit,
        BitField.from([oldOffset, newOffset], Math.pow(2, config.bitWidth)),
        BitField.empty(Math.pow(2, config.bitWidth)),
        /** @type {API.Children<T, K, C>} */
        (
          // We insert child with a lower index first so that we can derive it's
          // index on access via popcount
          oldOffset < newOffset
            ? [oldKey, oldValue, newKey, newValue]
            : [newKey, newValue, oldKey, oldValue]
        ),
        config
      )
    }
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
  children.length - 1 - config.BitField.popcount(nodemap, offset)

/**
 * @param {API.Edit|null} owner
 * @param {API.Edit|null} editor
 */
const canEdit = (owner, editor) => owner != null && owner === editor

/**
 * Returns `true` if node has a single entry. It also refines type to
 * `BitmapIndexedNode` because `HashCollisionNode` is normalized to
 * `BitmapIndexedNode` when it contains only a single entry.
 *
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.Node<T, K, C>} node
 * @returns {node is API.BitmapIndexedNode<T, K, C>}
 */
const hasSingleLeaf = node => node.nodeArity === 0 && node.dataArity === 1

/**
 * Returns `true` if node has a single childe node and 0 child leaves.
 *
 * @template T
 * @template {string} K
 * @template {API.Config} C
 * @param {API.BitmapIndexedNode<T, K, C>} node
 * @returns {node is API.BitmapIndexedNode<T, K, C>}
 */
const hasSingleNode = ({ config: { BitField }, datamap, nodemap }) =>
  BitField.popcount(datamap) === 0 && BitField.popcount(nodemap) === 1
