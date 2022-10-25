import * as Bits from "./bits.js"

/**
 * @typedef {object} Config
 * `bitWidth` determines the number of bits of the hash to use for index calculation at
 * each level of the tree
 * @property {number} bitWidth
 * `hash` calcualtes cryphtographic hash for the given source bytes
 * @property {(source: Uint8Array) => Uint8Array} hash
 * `hashSize` number of bytes to be used from produces hash.
 * @property {number} hashSize
 * }} Config
 */

/**
 * @param {Uint8Array} key
 * @param {number} depth
 * @param {Config} config
 */
export const read = (key, depth = 0, { bitWidth, hash, hashSize }) => {
  // key digest consists of infinite number of hash frames that are computed
  // from key + frame n which looks like
  // [hash(key), hash([key, 1]), hash([key, n])]
  // You can think of the hash as concatination of all frames. Here we calculate
  // frame bit size from hash size as we going to use that several times.
  const frameBitSize = hashSize * 8

  // We start with 0 digest and required `bitCount` corresponding to `bitWith`.
  // In the loop we'll going to consume `bitCount` hash bits.
  let digest = 0
  let bitCount = bitWidth
  // Calculate absolute bit offset within the key digest.
  let bitOffset = bitWidth * depth
  while (bitCount > 0) {
    // We dirive frame number based on current bit offset.
    const frameOffset = (bitOffset / frameBitSize) >> 0
    // Then we compute that hash frame
    const frame =
      frameOffset === 0 ? hash(key) : hash(appendByte(key, frameOffset))

    // compute bit offset within the current frame
    const offset =
      frameBitSize <= bitOffset ? bitOffset % frameBitSize : bitOffset
    // calculate number of bits remaining in this frame
    const maxBits = frameBitSize - offset
    // we will consumer all requiret bits from frame if enough are available
    // otherwise we consume whatever's available and continue rest in the next
    // cycle(s).
    const count = maxBits < bitCount ? maxBits : bitCount
    digest = (digest << count) + Bits.toInt(frame, offset, count)
    bitCount -= count
    bitOffset += count
  }

  return digest
}

/**
 * @param {Uint8Array} source
 * @param {number} byte
 */
const appendByte = (source, byte) => {
  const bytes = new Uint8Array(source.byteLength + 1).fill(
    byte,
    source.byteLength
  )
  bytes.set(source)
  return bytes
}
