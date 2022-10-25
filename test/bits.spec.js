import { assert, test } from "./test.js"
import * as Bits from "../src/bits.js"

const empty = new Uint8Array()
test("read from []", () => {
  assert.equal(Bits.toInt(empty, 0, 0), 0)
  assert.equal(Bits.toInt(empty, 0, 100), 0)
  assert.equal(Bits.toInt(empty, 10, 0), 0)
  assert.equal(Bits.toInt(empty, 10, 1000), 0)
})

const zero = Uint8Array.from([0])
test("can read from [0]", () => {
  assert.equal(Bits.toInt(zero, 0, 0), 0)

  assert.equal(Bits.toInt(zero, 0, 100), 0)
  assert.equal(Bits.toInt(zero, 100, 1000), 0)
})

const ones = Uint8Array.from([0b11111111])

test("can read 0 bits from [0b11111111]", () => {
  assert.equal(Bits.toInt(ones, 0, 0), 0)
})

for (let i = 0; i < 8; i++) {
  test(`can read 1 bit at ${i} offset from [0b11111111]`, () => {
    assert.equal(Bits.toInt(ones, i, 1), 1)
  })
}

test("shound not be able to take bits after 8th bit from [0b11111111]", () => {
  assert.equal(Bits.toInt(ones, 8, 1), 0)
  assert.equal(Bits.toInt(ones, 8, 100), 0)
  assert.equal(Bits.toInt(ones, 100, 1000), 0)
})

const full3 = Uint8Array.from([0xff, 0xff, 0xff])
test(`can read 0 bits from [${full3}]`, () => {
  assert.equal(Bits.toInt(full3, 0, 0), 0)
})

test(`can read 1 bit at a time from [${full3}]`, () => {
  for (let i = 0; i < 24; i++) {
    assert.equal(Bits.toInt(full3, i, 1), 1)
  }
})

test(`can only read first 24 bits from [${full3}]`, () => {
  assert.equal(Bits.toInt(full3, 24, 1), 0)
  assert.equal(Bits.toInt(full3, 24, 100), 0)
  assert.equal(Bits.toInt(full3, 100, 1000), 0)
})

test(`can read two bits at a time from [${full3}]`, () => {
  for (let i = 0; i < 24; i += 2) {
    assert.equal(Bits.toInt(full3, i, 2), 3)
  }
})

test(`can read read 24 bits from [${full3}]`, () => {
  assert.equal(Bits.toInt(full3, 0, 24), 0b111111111111111111111111)
})

test(`can read various bits`, () => {
  const bits = Uint8Array.from([0b01100101])
  assert.equal(Bits.toInt(bits, 0, 1), 0)
  assert.equal(Bits.toInt(bits, 1, 2), 3)
  assert.equal(Bits.toInt(bits, 3, 3), 1)
  assert.equal(Bits.toInt(bits, 6, 2), 1)
})

test(`can read from 0b10000000`, () => {
  const bits = Uint8Array.from([0b10000000])
  assert.equal(Bits.toInt(bits, 0, 2), 2)
})

test("reads right byte from left [0b11001000, 0b00001111]", () => {
  const bytes = Uint8Array.from([0b00001111, 0b11001000])
  assert.equal(Bits.toInt(bytes, 0, 4), 0b0000)
  assert.equal(Bits.toInt(bytes, 4, 4), 0b1111)
  assert.equal(Bits.toInt(bytes, 8, 4), 0b1100)
  assert.equal(Bits.toInt(bytes, 12, 4), 0b1000)
})
