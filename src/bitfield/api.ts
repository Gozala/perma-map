/**
 * Generic bit manipulation interface that enables implementation to choose
 * most optimal memory representation (e.g. `Uint32` for 32 bits and `Uint8Array`
 * for greater). BitField uses little-endian notation, from the least
 * significant bit to the most.
 *
 * This interface may seem bit unusual, because it requires passing generic
 * `Self` around, however that is what allows us to represent a bitfield as
 * a single `Uint32` value without any boxing, besides since HAMTS get
 * serialized into bytes and deserialized back all of the `prototype` methods
 * on the wrapper would be discarded anyway so more conventional approach would
 * be a poor fit anyway.
 *
 * @template {unknown} Self - BitField representation, which currently could be
 * `Uint32` or `Uint8Array`. It extends `unknown` however because we might add
 * different representatinos like `Uint32Array` in the future.
 */
export interface BitField<Self extends unknown = unknown> {
  /**
   * Creates a new `BitField` of given `size` (number of bits) where all bits
   * are unset.
   * ⚠️ Function may throw an exception if `size` considered invalid, e.g.
   * implementation may expect size to be muliples of `8`.
   */
  empty(size: Uint32): Self
  /**
   * Creates a new `BitField` of given `size` (number of bits) where bits only
   * at provided offsets are set. It is functionally equivalent of creating an
   * `empty` BitField and then setting each bit from given `bits` array.
   */
  from(bits: number[], size: Uint32): Self
  /**
   * Returns a copy of the `bitField` where bit at given `index` is set. If bit
   * at given index is set in provided `bitField`, operation is a noop and same `bitField` (and not a copy) is returned.
   */
  set(bitField: Self, index: Uint32): Self
  /**
   * Returns a copy of the `bitField` where bit at given `index` is unset. If
   * bit at given index is set in provided `bitField`, operation is a noop and
   * same `bitField` (and not a copy) is returned.
   */
  unset(bitField: Self, index: Uint32): Self
  /**
   * Returns `true` if bit at the given `index` is set, otherwise returns
   * `false`.
   */
  get(bitField: Self, index: Uint32): boolean
  /**
   * Returns number of set bits in the `bitField` (also known as population
   * count or the Hamming weight) before the provided `index`. If index is
   * omitted returns all the set bits.
   */
  popcount(bitField: Self, index?: Uint32): Uint32

  /**
   * Returns `BitField` with bits set where they were seit in either `left` or
   * `right`.
   */
  or(left: Self, right: Self): Self
  /**
   * Returns `BitField` with bits set where they were set in both `left` and
   * `right`.
   */
  and(left: Self, right: Self): Self

  /**
   * Returns size of this `BitField`, that is number of bits it contains.
   */
  size(self: Self): Uint32

  /**
   * Returns `Uint8Array` representation of this bitfield.
   */
  toBytes(bitfield: Self): Uint8Array

  /**
   * Creates `BitField` from the `Uint8Array` representation. It may throw
   * an exception, when given BitField may not be represented e.g. Uint8Array
   * with 5 bytes may not be represented via `Uint32`.
   */
  fromBytes(bytes: Uint8Array): Self
}
export type Uint32 = number
