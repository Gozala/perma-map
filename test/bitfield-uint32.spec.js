import { assert, test } from "./test.js"
import * as BitField from "../src/bitfield/Uint32.js"

test("test bitfield", () => {
  const v0 = BitField.empty()

  assert.equal(BitField.popcount(v0), 0)
  assert.equal(BitField.popcount(v0, 20), 0)
  assert.equal(BitField.size(v0), 32)

  const v1 = BitField.set(v0, 10)
  assert.equal(BitField.popcount(v1, 20), 1)
  assert.equal(BitField.size(v1), 32)
})

test("test BitField.from", () => {
  const v0 = BitField.from([7, 9, 0])
  let n = 0

  while (n < BitField.size(v0)) {
    assert.equal(BitField.get(v0, n), [7, 9, 0].includes(n))
    n++
  }
})

test("test BitField.unset", () => {
  const v0 = BitField.from([7, 9, 0])
  const v1 = BitField.unset(v0, 7)

  assert.deepEqual(BitField.get(v0, 7), true)
  assert.deepEqual(BitField.get(v1, 7), false)
})

test("BitField.popcount", () => {
  const v0 = BitField.empty()

  const v1 = BitField.set(v0, 7)
  assert.equal(BitField.popcount(v1, 0), 0)
  assert.equal(BitField.popcount(v1, 8), 1)
  assert.equal(BitField.popcount(v1, 7), 0)
})

test("BitField.or", () => {
  const v0 = BitField.from([1])
  const v1 = BitField.from([7])
  const v2 = BitField.or(v0, v1)

  assert.equal(BitField.get(v0, 1), true)
  assert.equal(BitField.get(v1, 1), false)
  assert.equal(BitField.get(v2, 1), true)
  assert.equal(BitField.get(v0, 7), false)
  assert.equal(BitField.get(v1, 7), true)
  assert.equal(BitField.get(v2, 7), true)
})

test("BitField.and", () => {
  const v0 = BitField.from([1, 7])
  const v1 = BitField.from([7, 9])
  const v2 = BitField.and(v0, v1)

  assert.equal(BitField.get(v0, 1), true)
  assert.equal(BitField.get(v1, 1), false)
  assert.equal(BitField.get(v2, 1), false)

  assert.equal(BitField.get(v0, 7), true)
  assert.equal(BitField.get(v1, 7), true)
  assert.equal(BitField.get(v2, 7), true)

  assert.equal(BitField.get(v0, 9), false)
  assert.equal(BitField.get(v1, 9), true)
  assert.equal(BitField.get(v2, 9), false)
})

test("test toBytes / fromBytes", () => {
  const v1 = BitField.set(BitField.empty(), 8)
  const b1 = Uint8Array.from([0, 0, 1, 0])
  assert.deepEqual(BitField.toBytes(v1), b1)
  assert.deepEqual(BitField.fromBytes(b1), v1)

  const v2 = BitField.set(BitField.empty(), 1)
  const b2 = Uint8Array.from([0, 0, 0, 2])
  assert.deepEqual(BitField.toBytes(v2), b2)
  assert.deepEqual(BitField.fromBytes(b2), v2)
})

test("throws when not enough bytes are provided", () => {
  assert.throws(
    () => BitField.fromBytes(Uint8Array.from([0, 0, 0])),
    /Expected 4 bytes instead got 3/
  )

  assert.throws(
    () => BitField.fromBytes(Uint8Array.from([0, 0, 0, 0, 0])),
    /Expected 4 bytes instead got 5/
  )
})

test("throws when size is not supported", () => {
  assert.throws(() => BitField.empty(3), /does not support size: 3/)

  assert.throws(() => BitField.empty(33), /does not support size: 33/)
})
