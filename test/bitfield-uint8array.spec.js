import { assert, test } from "./test.js"
import * as BitField from "../src/bitfield/Uint8Array.js"

test("test bitfield", () => {
  const v0 = BitField.empty(128)

  assert.equal(BitField.popcount(v0), 0)
  assert.equal(BitField.popcount(v0, 20), 0)

  const v1 = BitField.set(v0, 10)
  assert.equal(BitField.popcount(v1, 20), 1)

  assert.deepEqual([...v1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0])
})

test("test BitField.of", () => {
  const v0 = BitField.from([7, 9, 0], 128)
  let n = 0

  while (n < BitField.size(v0)) {
    assert.equal(BitField.get(v0, n), [7, 9, 0].includes(n))
    n++
  }
})

test("test bitfield", () => {
  const v0 = BitField.empty(32)

  const v1 = BitField.set(v0, 7)
  assert.equal(BitField.popcount(v1, 0), 0)
  assert.equal(BitField.popcount(v1, 8), 1)
  assert.equal(BitField.popcount(v1, 7), 0)
})

test("test toBytes / fromBytes", () => {
  const v1 = BitField.set(BitField.empty(32), 8)
  const b1 = Uint8Array.from([0, 0, 1, 0])

  assert.deepEqual(BitField.toBytes(v1), b1)
  assert.deepEqual(BitField.fromBytes(b1), v1)

  const v2 = BitField.set(BitField.empty(32), 1)
  const b2 = Uint8Array.from([0, 0, 0, 2])
  assert.deepEqual(BitField.toBytes(v2), b2)
  assert.deepEqual(BitField.fromBytes(b2), v2)
})

test("test 256bit field ", () => {
  const v0 = BitField.empty(256)
  const v1 = BitField.set(v0, 7)

  assert.equal(BitField.popcount(v1, 7), 0)
  assert.equal(BitField.popcount(v1, 8), 1)
  assert.equal(BitField.popcount(v1, 20), 1)
})
