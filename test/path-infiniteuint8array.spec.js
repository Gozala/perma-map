import { assert, test } from "./test.js"
import { read, hash64 as hash } from "../src/path/InfiniteUint8Array.js"

// In InfiniteUint8Array path you can never run out of hash bytes to use for
// shards. This tests that at depth 8 (one byte more than available in 64 bit
// hash) we still get a non-zero digest.
test('read from second hash frame', () => {
  assert.equal(read(new Uint8Array(), 8, { hash, hashSize: 8 }), 122)
})

// Tests the iteration in `read` what occurs when the size of the hash frames
// is smaller than the bit width, meaning that we need to iterate and generate
// additional hashes to be able to fill the digest.
// Note: would not happen in UnixFS as bitWidth is always 8
test('read with frame size smaller than bit width', () => {
  assert.equal(read(new Uint8Array(), 8, { hash, hashSize: 8, bitWidth: 128 }), 1705303293)
})
