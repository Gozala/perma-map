import { assert, test } from "./test.js"
import * as Bitfield from "../src/bitfield/bitfield-uint32.js"

test("test bitfield", () => {
  const v0 = Bitfield.create()

  assert.equal(Bitfield.popcount(v0), 0)
  assert.equal(Bitfield.popcount(v0, 20), 0)

  const v1 = Bitfield.set(v0, 10)
  assert.equal(Bitfield.popcount(v1, 20), 1)
})

test("test bitfield", () => {
  const v0 = Bitfield.create()

  const v1 = Bitfield.set(v0, 7)
  assert.equal(Bitfield.popcount(v1, 0), 0)
  assert.equal(Bitfield.popcount(v1, 8), 1)
  assert.equal(Bitfield.popcount(v1, 7), 0)
})

test("test toBytes / fromBytes", () => {
  const v1 = Bitfield.set(Bitfield.create(), 8)
  const b1 = Uint8Array.from([0, 1, 0, 0])
  assert.deepEqual(Bitfield.toBytes(v1), b1)
  assert.deepEqual(Bitfield.fromBytes(b1), v1)

  const v2 = Bitfield.set(Bitfield.create(), 1)
  const b2 = Uint8Array.from([2, 0, 0, 0])
  assert.deepEqual(Bitfield.toBytes(v2), b2)
  assert.deepEqual(Bitfield.fromBytes(b2), v2)
})
