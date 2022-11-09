import * as API from "./api.js"
import * as Bits from "../bits.js"
const utf8 = new TextEncoder()

/**
 * @param {API.Options<Uint8Array>} options
 * @returns {API.Path<Uint8Array>}
 */
export const configure = ({ bitWidth = 8, hash, hashSize }) => {
  const options = { bitWidth, hash, hashSize }

  /**
   * @param {Uint8Array} path
   * @param {number} depth
   * @returns {API.Uint32}
   */
  const at = (path, depth) => read(path, depth, options)

  /**
   * @param {string} key
   */
  const from = key => utf8.encode(key)

  return { at, from, size: Infinity }
}

/**
 * @param {Uint8Array} key
 * @param {number} depth
 * @param {Required<API.Options<Uint8Array>>} config
 */
export const read = (key, depth = 0, { bitWidth = 8, hash, hashSize }) => {
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
