import { assert, test } from "./test.js"
import * as HAMT from "../src/lib.js"
import * as BitField from "../src/bitfield/Uint32.js"
import * as Uint32Path from "../src/path/Uint32.js"
import * as Uint8ArrayPath from "../src/path/Uint8Array.js"
import * as UnixFS from "../src/unixfs.js"

/**
 * FNV-1a over bytes: a stand-in hash the tests can reason about.
 *
 * @param {Uint8Array} bytes
 */
const fnv = bytes => {
  let h = 0x811c9dc5
  for (const byte of bytes) {
    h = Math.imul(h ^ byte, 16777619)
  }
  return h >>> 0
}

/**
 * The default 32-bit configuration, with the hash given.
 *
 * @param {(bytes:Uint8Array) => number} hash
 */
const uint32 = hash => ({ Path: Uint32Path.configure({ bitWidth: 5, hash }) })

/** A small deterministic generator, so a failure repeats. */
const random = (seed = 0x2545f491) => {
  let state = seed
  return (/** @type {number} */ n) => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) % n
  }
}

/**
 * Applies `count` random sets and deletes over `keys` keys to a map and to
 * a `Map`, and checks after each that they agree on the size and every
 * key's value.
 *
 * @param {Partial<HAMT.Config>} config
 * @param {{count:number, keys:number}} options
 */
const agreesWithModel = (config, { count, keys }) => {
  const next = random()
  let hamt = HAMT.empty(config)
  const model = new Map()
  for (let n = 0; n < count; n++) {
    const key = `key-${next(keys)}`
    const op = next(3) === 0 ? `delete ${key}` : `set ${key}`
    if (op.startsWith("delete")) {
      hamt = hamt.delete(key)
      model.delete(key)
    } else {
      const value = next(1000)
      hamt = hamt.set(key, value)
      model.set(key, value)
    }
    assert.equal(hamt.size, model.size, `size after op ${n} (${op})`)
    for (const [k, v] of model) {
      assert.equal(hamt.get(k), v, `get(${k}) after op ${n} (${op})`)
    }
    assert.equal(
      [...hamt.keys()].length,
      model.size,
      `keys after op ${n} (${op})`
    )
  }
}

test("Uint32 BitField.unset clears only the bit given", () => {
  const v0 = BitField.from([7, 9, 31, 0])
  const v1 = BitField.unset(v0, 7)
  assert.deepEqual(
    [0, 7, 9, 31].map(n => BitField.get(v1, n)),
    [true, false, true, true]
  )
  const v2 = BitField.unset(v0, 9)
  assert.deepEqual(
    [0, 7, 9, 31].map(n => BitField.get(v2, n)),
    [true, true, false, true]
  )
})

test("Uint32 BitField.popcount with no index counts every bit", () => {
  assert.equal(BitField.popcount(BitField.from([31])), 1)
  assert.equal(BitField.popcount(BitField.from([0, 29, 31])), 3)
  // With an index it counts the bits below it.
  assert.equal(BitField.popcount(BitField.from([0, 29, 31]), 31), 2)
})

test("the default configuration hashes keys", () => {
  const v1 = HAMT.empty().set("hello", "world")
  assert.equal(v1.get("hello"), "world")
  assert.equal(v1.size, 1)
})

test("the default configuration agrees with a Map", function () {
  this.timeout(60 * 1000)
  agreesWithModel({}, { count: 3000, keys: 500 })
})

test("the 32-bit path agrees with a Map", function () {
  this.timeout(60 * 1000)
  agreesWithModel(uint32(fnv), { count: 3000, keys: 500 })
})

test("keys whose whole hashes collide", function () {
  this.timeout(60 * 1000)
  // Sixteen hashes for every key: each holds many colliding keys.
  const config = uint32(bytes => fnv(bytes) % 16)
  agreesWithModel(config, { count: 2000, keys: 120 })
})

test("colliding keys can be added in any order", () => {
  const config = uint32(() => 7)
  const keys = ["b", "d", "a", "c", "e"]
  const hamt = keys.reduce(
    (hamt, key) => hamt.set(key, key.toUpperCase()),
    HAMT.empty(config)
  )
  assert.equal(hamt.size, keys.length)
  for (const key of keys) {
    assert.equal(hamt.get(key), key.toUpperCase(), key)
  }
  // Removing all but one leaves an ordinary map of that one.
  const one = ["b", "d", "a", "c"].reduce((hamt, key) => hamt.delete(key), hamt)
  assert.equal(one.size, 1)
  assert.equal(one.get("e"), "E")
})

/**
 * Two keys that share the slot at depth 0 but no other prefix.
 *
 * @param {(key:string) => number} slot
 */
const sharingFirstSlot = slot => {
  const seen = new Map()
  for (let n = 0; ; n++) {
    const key = `key-${n}`
    const other = seen.get(slot(key))
    if (other !== undefined) {
      return [other, key]
    }
    seen.set(slot(key), key)
  }
}

test("removing down to one entry under a single branch keeps it", () => {
  // The two keys go into one child of the root. Removing one leaves the
  // root a single child of a single entry, which must come back up to
  // the root's own depth.
  const config = uint32(fnv)
  const encode = (/** @type {string} */ key) => new TextEncoder().encode(key)
  const [a, b] = sharingFirstSlot(key => fnv(encode(key)) & 0x1f)
  const hamt = HAMT.empty(config).set(a, 1).set(b, 2)
  assert.equal(hamt.delete(b).get(a), 1)
  assert.equal(hamt.delete(a).get(b), 2)
})

test("removing down to one entry under a single branch keeps it (UnixFS)", () => {
  const [a, b] = sharingFirstSlot(key => {
    const path = UnixFS.config.Path.from(key)
    return UnixFS.config.Path.at(path, 0)
  })
  const hamt = HAMT.empty(UnixFS.config).set(a, 1).set(b, 2)
  assert.equal(hamt.delete(b).get(a), 1)
  assert.equal(hamt.delete(a).get(b), 2)
})

test("builders agree with a Map", () => {
  const next = random(7)
  const builder = HAMT.builder(uint32(bytes => fnv(bytes) % 64))
  const model = new Map()
  for (let n = 0; n < 2000; n++) {
    const key = `key-${next(150)}`
    if (next(3) === 0) {
      builder.delete(key)
      model.delete(key)
    } else {
      builder.set(key, n)
      model.set(key, n)
    }
  }
  const hamt = builder.build()
  assert.equal(hamt.size, model.size)
  for (const [k, v] of model) {
    assert.equal(hamt.get(k), v, k)
  }
})

/**
 * How deep the first collision node under `hamt`'s root is.
 *
 * @param {HAMT.PersistentHashMap<unknown, string>} hamt
 */
const collisionDepth = hamt => {
  /** @type {any} */
  let node = hamt.root
  let depth = 0
  while (node.count === undefined) {
    // A node's branches are at the end of its children.
    node = node.children[node.children.length - 1]
    depth++
  }
  return depth
}

test("colliding keys meet once the hash is used up", () => {
  // Seven levels of five bits use up a 32-bit hash, so the collision
  // node is at depth 7, not a level below it.
  const config = uint32(() => 0x12345678)
  const hamt = HAMT.empty(config).set("a", 1).set("b", 2)
  assert.equal(config.Path.size, 7)
  assert.equal(collisionDepth(hamt), 7)
  assert.equal(hamt.get("a"), 1)
  assert.equal(hamt.get("b"), 2)
})

test("a map of 8-bit slots grows past two levels", function () {
  this.timeout(60 * 1000)
  let hamt = HAMT.empty({ bitWidth: 8 })
  for (let n = 0; n < 2000; n++) {
    hamt = hamt.set(`key-${n}`, n)
  }
  assert.equal(hamt.size, 2000)
  for (let n = 0; n < 2000; n++) {
    assert.equal(hamt.get(`key-${n}`), n)
  }
})

test("8-bit slots agree with a Map", function () {
  this.timeout(60 * 1000)
  agreesWithModel({ bitWidth: 8 }, { count: 2000, keys: 400 })
})

test("colliding entries are listed and updated", () => {
  const config = uint32(() => 7)
  let hamt = HAMT.empty(config).set("a", 1).set("b", 2).set("c", 3)
  // Setting a key to the value it has is no change; to another value is.
  assert.equal(hamt.set("b", 2), hamt)
  hamt = hamt.set("b", 20)
  assert.equal(hamt.get("b"), 20)
  assert.deepEqual([...hamt.entries()].sort(), [
    ["a", 1],
    ["b", 20],
    ["c", 3],
  ])
  assert.deepEqual([...hamt.keys()].sort(), ["a", "b", "c"])
  const values = /** @type {number[]} */ ([...hamt.values()])
  assert.deepEqual(
    values.sort((a, b) => a - b),
    [1, 3, 20]
  )
  // A key of the same hash that is not there.
  assert.equal(hamt.get("z"), undefined)
  assert.equal(hamt.has("z"), false)
})

test("a path of bytes has no slot past its hash", () => {
  const Path = Uint8ArrayPath.configure({
    bitWidth: 8,
    hash: () => new Uint8Array([1, 2, 3, 4]),
  })
  const path = Path.from("key")
  assert.equal(Path.size, 4)
  assert.equal(Path.at(path, 3), 4)
  assert.throws(() => Path.at(path, 4), /Out of bounds/)
})
