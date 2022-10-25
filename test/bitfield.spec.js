import { assert, test } from "./test.js"
import * as Bitfield from "../src/hamt/bitfield.js"

test("test bitfield", () => {
  const bf = Bitfield.create(128)

  assert.equal(Bitfield.popcount(bf), 0)
  assert.equal(Bitfield.popcount(bf, 0, 20), 0)

  Bitfield.set(bf, 10)
  assert.equal(Bitfield.popcount(bf, 0, 20), 1)
})

test("test bitfield", () => {
  const bf = Bitfield.create()

  Bitfield.set(bf, 7)
  assert.equal(Bitfield.popcount(bf, 0, 0), 0)
  assert.equal(Bitfield.popcount(bf, 0, 8), 1)
  assert.equal(Bitfield.popcount(bf, 0, 7), 0)
  assert.equal(Bitfield.popcount(bf, 7), 1)
})
