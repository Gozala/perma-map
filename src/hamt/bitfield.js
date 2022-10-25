export const BITWIDTH = 256

export const create = (bitCount = BITWIDTH) => new Uint8Array(bitCount / 8)

/**
 * @param {Uint8Array} bf
 * @param {number} index
 */
const offset = (bf, index) => [bf.byteLength - 1 - ((index / 8) | 0), index % 8]

/**
 * Set a particular bit.
 *
 * @param {Uint8Array} bitfield
 * @param {number} index
 * @returns {Uint8Array}
 */
export const set = (bitfield, index) => {
  const [byteOffset, bitOffset] = offset(bitfield, index)
  bitfield[byteOffset] |= 1 << bitOffset
  return bitfield
}

/**
 * Unsets a particular bit.

 * @param {Uint8Array} bitfield
 * @param {number} index
 * @returns {Uint8Array}
 */
export const unset = (bitfield, index) => {
  const [byteOffset, bitOffset] = offset(bitfield, index)
  bitfield[byteOffset] &= 0xff ^ (1 << bitOffset)
  return bitfield
}

/**
 * Returns `true` if bit at given index is set.

 * @param {Uint8Array} bitfield
 * @param {number} index
 */
export const get = (bitfield, index) => {
  const [byteOffset, bitOffset] = offset(bitfield, index)
  return ((bitfield[byteOffset] >> bitOffset) & 0x1) != 0
}

/**
 * @param {Uint8Array} bitfield
 * @param {number} start
 * @param {number} end
 */
export const popcount = (
  bitfield,
  start = 0,
  end = bitfield.byteLength * 8
) => {
  let count = 0
  let startOffset = 0
  let endOffset = bitfield.byteLength

  if (start > 0) {
    const [byteOffset, bitOffset] = offset(bitfield, start)
    const byte = bitfield[byteOffset]

    count += countBitsSet(byte >> bitOffset)
    endOffset = byteOffset - 1
  }

  if (end < bitfield.byteLength * 8) {
    const [byteOffset, bitOffset] = offset(bitfield, end)
    const byte = bitfield[byteOffset]

    count += countBitsSet(byte << (8 - bitOffset))
    startOffset = byteOffset + 1
  }

  let currentOffset = startOffset
  while (currentOffset < endOffset) {
    const byte = bitfield[currentOffset]
    count += countBitsSet(byte)
    currentOffset++
  }

  return count
}

/**
 * @param {number} n
 */
const countBitsSet = n => {
  n = n % 256
  n = n - ((n >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24
}

/**
 * @param {Uint8Array} left
 * @param {Uint8Array} right
 */
export const or = (left, right) => {
  const result = left.slice()
  let offset = 0
  while (offset < left.length) {
    result[offset] |= right[offset]
    offset++
  }
  return result
}

/**
 * @param {Uint8Array} left
 * @param {Uint8Array} right
 */
export const and = (left, right) => {
  const result = left.slice()
  let offset = 0
  while (offset < left.length) {
    result[offset] &= right[offset]
    offset++
  }
  return result
}

/**
 *
 * @param {Uint8Array} bitfield
 */
export const iterate = function* (bitfield) {
  const size = bitfield.byteLength * 8
  let bitOffset = 0
  let bitCount = 0
  while (bitOffset < size) {
    if (get(bitfield, bitOffset)) {
      yield [bitOffset, ++bitCount]
    }
    bitOffset++
  }
}
