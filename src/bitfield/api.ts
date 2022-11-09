export interface BitField<Self extends unknown = unknown> {
  empty(size: Uint32): Self

  from(bits: number[], size: Uint32): Self
  set(bitField: Self, index: Uint32): Self
  unset(bitField: Self, index: Uint32): Self
  get(bitField: Self, index: Uint32): boolean

  popcount(bitField: Self, index?: Uint32): Uint32

  or(left: Self, right: Self): Self
  and(left: Self, right: Self): Self

  /**
   * Countns number of bits in the given bitfield.
   */
  size(self: Self): Uint32

  toBytes(bitfield: Self): Uint8Array
  fromBytes(bytes: Uint8Array): Self
}
export type Uint32 = number
