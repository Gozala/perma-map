export * from "../hamt/api.js"
import * as API from "src/hamt/api.js"

export interface Options<Self> {
  bitWidth?: number
  hash: (input: Uint8Array) => Self
  hashSize: number
}

export interface Path<Self> {
  from(key: string): Self

  size: API.Uint32
  at(path: Self, depth: number): API.Uint32
}
