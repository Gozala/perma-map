import type { Uint32 } from "../bitfield/api.js"

export type { Uint32 }

export interface Options<Self> {
  bitWidth?: number
  hash: (input: Uint8Array) => Self
}

/**
 * Generic key path manipulation interface that enables implementation to choose
 * most optimal memory representation (e.g. `Uint32` uses 32 bit murmur3 hash
 * and encodes whole key as single Uint32. `InfiniteUint8Array` on the other
 * hand computes hash on demand when calling `at`).
 *
 * General idea here is that we can derive tree path from arbitrary string key.
 * for example if key "result" with 32 bit murmur3 hash will produce a hash
 * `442064690` which in binary would be:
 *
 * ```ts
 * 0b11010010110010101111100110010
 * ```
 *
 * Representing it as path with `bitWidth` of `5` we would get:
 *
 * ```ts
 * 0b0_11010_01011_00101_01111_10011_0010
 * ```
 *
 * Which as array of decimals would look like:
 *
 *
 * ```ts
 * [26, 11, 5, 15, 19, 2]
 * ```
 *
 * This interface provides an array like view of the string keys, with
 * configurable `hashing` function and `bitWidth`.
 */
export interface Path<Self> {
  /**
   * Creates 'Path` for the given `key`.
   */
  from(key: string): Self
  /**
   * Max depth size (which can be determined from hash size and `bitWidth` used)
   */
  size: Uint32
  /**
   * Returns an integer representation of the bits that correspond to the given
   * `depth`.
   */
  at(path: Self, depth: number): number
}
