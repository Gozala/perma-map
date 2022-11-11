import type { Uint32 } from "../bitfield/api.js"

export type { Uint32 }
export interface Options<Self> {
  bitWidth?: number
  hash: (input: Uint8Array) => Self
  hashSize: number
}

export interface Path<Self> {
  from(key: string): Self

  size: Uint32
  at(path: Self, depth: number): Uint32
}
