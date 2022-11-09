/**
 * @param {Uint8Array} bytes
 * @param {number} offset - bit offset
 * @param {number} count - number of bits to consume
 */
export const toInt = (bytes, offset, count) => {
  let byteOffset = (offset / 8) | 0
  let bitOffset = offset % 8
  let desired = count
  let bits = 0
  while (desired > 0 && byteOffset < bytes.byteLength) {
    const byte = bytes[byteOffset]
    const available = 8 - bitOffset

    const taking = available < desired ? available : desired
    const bitsLeft = 8 - bitOffset - taking
    // mask to turn of bits before bitOffset
    const mask = 0xff >> bitOffset
    // turn off offset bits and shift to drop remaining bit on the right
    const value = (mask & byte) >> bitsLeft
    bits = (bits << taking) + value

    desired -= taking
    byteOffset++
    bitOffset = 0
  }

  return bits
}
