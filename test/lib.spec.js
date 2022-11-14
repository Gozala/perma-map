import { assert, test } from "./test.js"
import * as HAMT from "../src/lib.js"
import * as UnixFS from "../src/unixfs.js"

import { insert, iterate, byKey, byName } from "./util.js"

test("hamt basic", () => {
  const v0 = HAMT.empty(UnixFS.config)

  assert.equal(UnixFS.tableSize(v0), 256)
  assert.equal(v0.size, 0)

  const v1 = v0.set("hello", "world")
  assert.equal(v1.size, 1)
  assert.equal(v1.has("hello"), true)
  assert.equal(v0.has("hello"), false)
  assert.equal(v1.get("hello"), "world")
  assert.equal(v0.get("hello"), undefined)
  assert.equal(v1.get("bucket"), undefined)

  const v2 = v0.set("key", "value")
  assert.equal(v2.size, 1)
  assert.equal(v1.size, 1)
  assert.equal(v0.size, 0)
  assert.equal(v2.get("key"), "value")
  assert.equal(v1.get("key"), undefined)
})

test("HAMT can override a value", () => {
  const v0 = HAMT.empty(UnixFS.config)
  const v1 = v0.set("key", "value")
  const v2 = v1.set("key", "other value")

  assert.equal(v1.get("key"), "value")
  assert.equal(v2.get("key"), "other value")
})

test("HAMT setting same value is noop", () => {
  const v0 = HAMT.empty(UnixFS.config)
  const v1 = v0.set("key", "value")

  const v2 = v1.set("key", "value")

  assert.equal(v1, v2)
})

test("HAMT can remove a non existing value", () => {
  const v0 = HAMT.empty(UnixFS.config)
  const v1 = v0.delete("a key which does not exist")

  assert.equal(v0, v1)
  assert.equal(v1.size, 0)
})

test("HAMT can remove an existing value", () => {
  const v0 = HAMT.empty(UnixFS.config)
  const v1 = v0.set("key", "value")
  const v2 = v1.delete("key")

  assert.equal(v0.get("key"), undefined)
  assert.equal(v1.get("key"), "value")
  assert.equal(v2.get("key"), undefined)

  assert.deepEqual(v0, v2, "delete restores the shape")
  assert.notDeepEqual(v0, v1)
})

test("HAMT should count leaves", () => {
  const v0 = HAMT.empty(UnixFS.config)
  assert.equal(v0.size, 0)

  const v1 = insert(v0, iterate(400))
  assert.equal(v1.size, 400)
})

test("HAMT should iterate over entries", () => {
  const v0 = HAMT.empty(UnixFS.config)
  assert.equal(v0.size, 0)

  const SIZE = 400
  const v1 = insert(v0, iterate(SIZE))

  assert.deepEqual([...v1.entries()].sort(byKey), [...iterate(SIZE)])
})

test("HAMT iterable should iterate values", () => {
  const v0 = HAMT.empty(UnixFS.config)
  assert.equal(v0.size, 0)

  const v1 = insert(v0, iterate(400))
  assert.deepEqual([...v1].sort(byKey), [...iterate(400)])
})

test("HAMT should be iterate over keys", () => {
  const v0 = HAMT.empty(UnixFS.config)
  assert.equal(v0.size, 0)

  const v1 = insert(v0, iterate(400))
  assert.deepEqual(
    [...v1.keys()].sort(byName),
    [...iterate(400)].map(([k]) => k)
  )
})

test("HAMT should be iterate over values", () => {
  const v0 = HAMT.empty(UnixFS.config)
  assert.equal(v0.size, 0)

  const v1 = insert(v0, iterate(400))
  assert.deepEqual(
    [...v1.values()].sort(byName),
    [...iterate(400)].map(([k]) => k)
  )
})

test("HAMT insert & remove many but find remaining", () => {
  const entries = [...iterate(400)]
  let hamt = insert(HAMT.empty(UnixFS.config), entries)

  const [key, value] = /** @type {[string, string]} */ (entries.pop())
  for (const [key, value] of entries.reverse()) {
    assert.equal(hamt.get(key), value)
    hamt = hamt.delete(key)

    assert.equal(hamt.get(key), undefined)
  }

  assert.deepEqual(
    hamt,
    HAMT.empty(UnixFS.config).set(key, value),
    "collapsed all nodes"
  )

  assert.equal(hamt.get(key), value)
})

test("HAMT insert & remove many but find remaining", () => {
  const entries = [...iterate(400)]
  let hamt = insert(HAMT.empty(UnixFS.config), entries)

  assert.deepEqual(hamt.empty(), HAMT.empty(UnixFS.config))
})

test("HAMT can use builder for batch inserts", () => {
  const size = 4000
  const entries = [...iterate(size)]
  const b0 = HAMT.builder(UnixFS.config)
  assert.equal(b0.size, 0)
  const b1 = insert(b0, entries)
  assert.equal(b0, b1)
  assert.equal(b1.size, size)
  const v0 = b1.build()
  assert.throws(() => b1.size, /.size .* finalized/)
  assert.throws(() => b0.size, /.size .* finalized/)

  assert.deepEqual([...v0].sort(byKey), entries)
  assert.throws(() => b1.set("10", "10"), /.set .* finalized/)
  assert.throws(() => b1.delete("10"), /.delete .* finalized/)
  assert.throws(() => b1.build(), /.build .* finalized/)
})

test.skip("bug hunt", () => {
  const MAX = 4000
  let hamt = HAMT.empty(UnixFS.config).createBuilder()

  let n = 0
  while (n < MAX) {
    if (n === 37) {
      debugger
    }
    hamt = hamt.set(`${n}`, n)
    let n2 = 0
    console.log(`hamt.set("${n}", ${n})`)
    while (n2 <= n) {
      // console.log(`  hamt.get("${n2}")`)
      assert.equal(HAMT.get(hamt, `${n2}`), n2, `${n2}`)
      n2++
    }
    n++
  }
})

test("HAMT can use builder for batch deletes", () => {
  const size = 4000
  const entries = [...iterate(size)]
  const v0 = HAMT.empty(UnixFS.config)
  assert.equal(v0.size, 0)

  const v1 = insert(v0, iterate(size))
  assert.deepEqual([...v1.entries()].sort(byKey), entries)

  let b1 = v1.createBuilder()
  let builder = b1

  const [key, value] = /** @type {[string, string]} */ (entries.pop())
  for (const [key] of entries.reverse()) {
    builder = builder.delete(key)
  }

  assert.equal(b1, builder)
  const v2 = builder.build()

  assert.deepEqual(
    v2,
    HAMT.builder(UnixFS.config).set(key, value).build(),
    "collapsed all nodes"
  )
})

test("HAMT can short circuit on empty builder", () => {
  const b1 = HAMT.builder(UnixFS.config)
  assert.equal(b1, b1.delete("key"))
  assert.equal(b1.size, 0)
})

test("HAMT can clone", () => {
  const b = insert(HAMT.builder(UnixFS.config), iterate(300))
  const v1 = b.build()
  assert.deepEqual(v1, v1.clone())
})

test("HAMT emulate hash collision", () => {
  const v1 = insert(HAMT.builder(UnixFS.config), iterate(300)).build()
  const key = v1.root.children[3 * 2]
  // Pretent we had a hash collision
  v1.root.children[3 * 2] = "collider"

  assert.equal(v1, v1.delete(key))
  assert.equal(v1.size, 300)
})
